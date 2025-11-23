import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { CreateSinpePaymentDto } from './dto/create-sinpe-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParamValidatorPipe } from '../common/security/param-validator.pipe';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@UsePipes(ParamValidatorPipe)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('orders/:orderId/sinpe')
  createSinpePayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
    @Body() createSinpePaymentDto: CreateSinpePaymentDto,
  ) {
    return this.paymentsService.createSinpePayment(orderId, user.id, createSinpePaymentDto);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('orders/:orderId')
  getPaymentsByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === 'ADMIN';
    return this.paymentsService.getPaymentsByOrder(orderId, user.id, isAdmin);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === 'ADMIN';
    return this.paymentsService.findOne(id, user.id, isAdmin);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  confirmPayment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmPayment(id, user.id, confirmPaymentDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch(':id/fail')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  failPayment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { reason?: string },
  ) {
    return this.paymentsService.failPayment(id, user.id, body.reason);
  }
}
