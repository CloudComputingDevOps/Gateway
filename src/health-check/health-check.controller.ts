import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HealthCheckController {

  @Get()
  healthCheck(){
    return 'Gateway running after doing changes in CI/CD Pipelines'
  }

}
