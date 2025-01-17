import { WebAuthnCredential } from './../../node_modules/@simplewebauthn/server/script/types/index.d';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Authenticator } from './entities/auth.entity';
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  AttestationFormatVerifierOpts,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly rpName = 'Your App Name';
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
      // Create new user
      user = this.userRepository.create({
        email,
        webauthnId: Buffer.from(email).toString('base64url'),
      });
      await this.userRepository.save(user);
    }

    const authenticators = await this.authenticatorRepository.find({
      where: { user: { id: user.id } },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(user.webauthnId, 'base64url'),
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      excludeCredentials: authenticators.map(authenticator => ({
        id: authenticator.credentialId,
        transports: authenticator.transports,
      })),
    });

    // Save the current challenge
    user.currentChallenge = options.challenge;
    await this.userRepository.save(user);

    return options;
  }

  async verifyRegistration(
    email: string,
    response: RegistrationResponseJSON,
  ) {
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
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const {
        credentialType,
        credentialDeviceType,
        credentialBackedUp,
      } = registrationInfo;

      const newAuthenticator = this.authenticatorRepository.create({
        user: user,
        webauthnUserId: user.webauthnId,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: response.response.transports,
      });

      await this.authenticatorRepository.save(newAuthenticator);

      // Clear the challenge
      user.currentChallenge = undefined;
      await this.userRepository.save(user);

      return {
        verified,
        user: { id: user.id, email: user.email },
      };
    }

    throw new UnauthorizedException('Registration verification failed');
  }

  async generateAuthenticationOptions(email: string) {
    const user = await this.userRepository.findOne({ 
      where: { email },
      relations: ['authenticators'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const authenticators = await this.authenticatorRepository.find({
      where: { user: { id: user.id } },
    });

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: authenticators.map(authenticator => ({
        id: authenticator.credentialId,
        type: 'public-key',
        transports: authenticator.transports,
      })),
      userVerification: 'preferred',
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

    const authenticator = await this.authenticatorRepository.findOne({
      where: { 
        credentialId: Buffer.from(response.id, 'base64url').toString('base64url'),
      },
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
        publicKey: authenticator.credentialPublicKey,
        counter: 0,
        transports: []
      }
    });

    const { verified } = verification;

    if (verified) {
      // Update the authenticator's counter
      authenticator.counter = verification.authenticationInfo.newCounter;
      await this.authenticatorRepository.save(authenticator);

      // Clear the challenge
      user.currentChallenge = undefined;
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
