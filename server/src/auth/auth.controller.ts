import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/options')
  async getRegistrationOptions(
    @Body() body: { email: string },
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return this.authService.generateRegistrationOptions(body.email);
  }

  @Post('register/verify')
  async verifyRegistration(
    @Body() body: { email: string; response: any },
  ) {
    return this.authService.verifyRegistration(body.email, body.response);
  }

  @Post('login/options')
  async getAuthenticationOptions(
    @Body() body: { email: string },
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return this.authService.generateAuthenticationOptions(body.email);
  }

  @Post('login/verify')
  async verifyAuthentication(
    @Body() body: { email: string; response: any },
  ) {
    return this.authService.verifyAuthentication(body.email, body.response);
  }

  @Get('authenticators')
  @UseGuards(JwtAuthGuard)
  async getAuthenticators(@Query('email') email: string) {
    return this.authService.getAuthenticators(email);
  }
}
