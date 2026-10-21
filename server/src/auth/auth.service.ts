import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Authenticator } from './entities/auth.entity';
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly rpName = 'Passwordless Auth';
  private readonly rpID: string;
  private readonly origin: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Authenticator)
    private readonly authenticatorRepository: Repository<Authenticator>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID');
    this.origin = this.configService.get<string>('WEBAUTHN_ORIGIN');
  }

  async generateRegistrationOptions(email: string) {
    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      user = this.userRepository.create({
        email,
        webauthnId: randomBytes(32).toString('base64url'),
      });
      await this.userRepository.save(user);
    }

    const authenticators = await this.authenticatorRepository.find({
      where: { user: { id: user.id } },
    });

    if (authenticators.length > 0) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in.',
      );
    }

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(user.webauthnId, 'base64url'),
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      excludeCredentials: authenticators.map((authenticator) => ({
        id: authenticator.credentialId,
        transports: authenticator.transports,
      })),
    });

    // Save the current challenge
    user.currentChallenge = options.challenge;
    await this.userRepository.save(user);

    return options;
  }

  async verifyRegistration(email: string, response: RegistrationResponseJSON) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'currentChallenge', 'webauthnId'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: true,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } =
        registrationInfo;
      const newAuthenticator = this.authenticatorRepository.create({
        credentialId: credential.id,
        credentialPublicKey: credential.publicKey,
        counter: credential.counter,
        user: user,
        webauthnUserId: user.webauthnId,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: response.response.transports,
      });

      await this.authenticatorRepository.save(newAuthenticator);
      user.currentChallenge = null;
      await this.userRepository.save(user);

      return {
        verified,
        user: { id: user.id, email: user.email },
      };
    }

    throw new UnauthorizedException('Registration verification failed');
  }

  async generateAuthenticationOptions(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const authenticators = await this.authenticatorRepository.find({
      where: { user: { id: user.id } },
    });

    if (authenticators.length === 0) {
      throw new UnauthorizedException(
        'No passkey registered for this account. Please sign up.',
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: authenticators.map((authenticator) => ({
        id: authenticator.credentialId,
        transports: authenticator.transports,
      })),
      userVerification: 'required',
    });

    // Save the current challenge
    user.currentChallenge = options.challenge;
    await this.userRepository.save(user);

    return options;
  }

  async verifyAuthentication(
    email: string,
    response: AuthenticationResponseJSON,
  ) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'currentChallenge'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Look up the credential among this user's passkeys only. Otherwise someone
    // could sign this user's challenge with their own passkey and get a token for this account.
    const authenticator = await this.authenticatorRepository.findOne({
      where: { credentialId: response.id, user: { id: user.id } },
    });

    if (!authenticator) {
      throw new UnauthorizedException('Authenticator not found');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: authenticator.credentialId,
        publicKey: new Uint8Array(authenticator.credentialPublicKey),
        // Postgres returns bigint columns as strings
        counter: Number(authenticator.counter),
        transports: authenticator.transports,
      },
      requireUserVerification: true,
    });

    const { verified } = verification;

    if (verified) {
      // Update the counter (catches cloned authenticators) and the backup state
      authenticator.counter = verification.authenticationInfo.newCounter;
      authenticator.backedUp =
        verification.authenticationInfo.credentialBackedUp;
      await this.authenticatorRepository.save(authenticator);

      // Clear the challenge so it can't be replayed
      user.currentChallenge = null;
      await this.userRepository.save(user);

      // Generate JWT token
      const payload = { sub: user.id, email: user.email };
      return {
        accessToken: this.jwtService.sign(payload),
        user: { id: user.id, email: user.email },
      };
    }

    throw new UnauthorizedException('Authentication verification failed');
  }

  async getAuthenticators(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const authenticators = await this.authenticatorRepository.find({
      where: { user: { id: user.id } },
    });
    return authenticators;
  }
}
