import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/enums/role.enum';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import {
  BootstrapAdminDto,
  ChangePasswordDto,
  CreateAdminDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ResponseMessage('Login successful')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @ResponseMessage('Password reset instructions processed successfully')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ResponseMessage('Password reset successful')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('bootstrap')
  @ResponseMessage('Admin bootstrapped successfully')
  bootstrap(@Body() bootstrapAdminDto: BootstrapAdminDto) {
    return this.authService.bootstrap(bootstrapAdminDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('admins')
  @ResponseMessage('Admin created successfully')
  createAdmin(
    @Req() req: RequestWithUser,
    @Body() createAdminDto: CreateAdminDto,
  ) {
    const role = req.user?.role;
    if (!role) {
      throw new UnauthorizedException('Missing authenticated user.');
    }
    return this.authService.registerAdmin(role, createAdminDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ResponseMessage('Current user fetched successfully')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    return this.authService.me(token);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @ResponseMessage('Password changed successfully')
  changePassword(
    @Req() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user.');
    }
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Get('roles')
  @ResponseMessage('Roles fetched successfully')
  getRoles() {
    return Object.values(Role);
  }
}
