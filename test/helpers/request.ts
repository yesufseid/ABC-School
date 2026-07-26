import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export class TestRequest {
  private get agent() {
    return request(this.app.getHttpServer());
  }

  constructor(private readonly app: INestApplication) {}

  get(url: string) {
    return this.agent.get(url);
  }

  post(url: string) {
    return this.agent.post(url);
  }

  patch(url: string) {
    return this.agent.patch(url);
  }

  delete(url: string) {
    return this.agent.delete(url);
  }
}
