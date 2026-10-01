import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser, LoginRequest, LoginResponse, RegisterRequest } from '@guryeeye/shared';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, Public } from './auth.decorators';
import { AuthService } from './auth.service';

class LoginDto implements LoginRequest {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}

class RegisterDto implements RegisterRequest {
  @IsString() @MinLength(2) @MaxLength(120) businessName: string;
  @IsString() @MinLength(1) @MaxLength(80) city: string;
  @IsString() @MinLength(2) @MaxLength(80) country: string;
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(200) password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.auth.login(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() body: RegisterDto): Promise<LoginResponse> {
    return this.auth.register(body);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
