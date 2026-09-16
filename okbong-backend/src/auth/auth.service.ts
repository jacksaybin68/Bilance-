import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserEntity } from '../user/entity/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await user.comparePassword(password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(user: UserEntity) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      expiresIn: '1h',
    };
  }

  async refreshToken(user: UserEntity) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      expiresIn: '1h',
    };
  }
}
