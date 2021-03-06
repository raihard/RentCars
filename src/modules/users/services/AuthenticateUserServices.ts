import authConfig from '@config/auth';
import IHashPassword from '@modules/users/providers/HashPassword/IHashPassword';
import { IUsersRepository } from '@modules/users/repositories/IUsersRepository';
import User from '@modules/users/typeorm/entities/User';
import { sign } from 'jsonwebtoken';
import moment from 'moment';
import { injectable, inject } from 'tsyringe';

import AppError from '@errors/AppError';

import { IUserTokenRepository } from '../repositories/IUserTokenRepository';

interface IRequest {
  email_username: string;

  password: string;
}

interface IResponse {
  user: User;
  token: string;
  refresh_token: string;
}

@injectable()
class AuthenticateUserServices {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    @inject('UserTokenRepository')
    private userTokenRepository: IUserTokenRepository,

    @inject('HashPassword')
    private hashPassword: IHashPassword,
  ) {}

  public async execute({
    email_username,
    password,
  }: IRequest): Promise<IResponse> {
    let user = await this.usersRepository.findByEmail(email_username);

    if (!user) user = await this.usersRepository.findByUsername(email_username);

    if (!user)
      throw new AppError(
        'Incorrect email/username and password combination',
        401,
      );

    const isMatched = await this.hashPassword.HashCompare(
      password,

      user.password,
    );

    if (!isMatched)
      throw new AppError('Incorrect email/password combination', 401);

    const {
      secret,
      expiresIn,
      secret_refresh,
      expiresIn_Refresh,
      expiresIn_Refresh_day,
    } = authConfig.jwt;

    const token = sign({}, secret, {
      subject: user.id,
      expiresIn,
    });

    const refreshToken = await this.userTokenRepository.findByUserId(user.id);
    if (refreshToken) this.userTokenRepository.deleteByid(refreshToken.id);

    const refresh_token = sign({}, secret_refresh, {
      subject: user.id,
      expiresIn: expiresIn_Refresh,
    });

    this.userTokenRepository.create({
      user_id: user.id,
      expires_date: moment().add(expiresIn_Refresh_day, 'd').toDate(),
      refresh_token,
    });
    return { user, token, refresh_token };
  }
}

export default AuthenticateUserServices;
