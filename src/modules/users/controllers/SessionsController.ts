import AuthenticateUserServices from '@modules/users/services/AuthenticateUserServices';
import { classToClass } from 'class-transformer';
import { Request, Response } from 'express';
import { container } from 'tsyringe';

export default class SessionsController {
  public async create(request: Request, response: Response): Promise<Response> {
    const { email_username, password } = request.body;

    const authenticateUser = container.resolve(AuthenticateUserServices);

    const { user, token, refresh_token } = await authenticateUser.execute({
      email_username,
      password,
    });

    return response.json({ user: classToClass(user), token, refresh_token });
  }
}
