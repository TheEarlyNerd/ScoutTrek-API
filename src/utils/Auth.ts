import { Request } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { AuthChecker, ResolverData } from 'type-graphql';

import { UserModel } from '../../models/models';
import { ROLE } from '../../models/TroopAndPatrol';
import { User } from '../../models/User';

import type { ContextType } from "../server";
import type { DocumentType } from "@typegoose/typegoose";

const SECRET = "themfingsuperobvioussting";
const DEFAULT_EXPIRES_IN = "55d";

interface UserToken {
  id: string;
}

/**
 * takes a user token object and creates jwt out of it
 * using user.id and user.role
 * @param {Object} user the user to create a jwt for
 */
export function createToken(unsignedToken: UserToken): string {
  return sign({id: unsignedToken.id}, SECRET, { expiresIn: DEFAULT_EXPIRES_IN });
}

/**
 * will attempt to verify a jwt and find a user in the
 * db associated with it. Catches any error and returns
 * a null user
 * @param {String} token jwt from client
 * @throws {Error} if user cannot be found from specified token
 */
export async function getUserFromToken(encodedToken: string): Promise<DocumentType<User>> {
  if (!encodedToken) {
    return Promise.reject();
  }
  const jwtUserInfo = verify(encodedToken, SECRET) as UserToken;
  const user = await UserModel.findById(jwtUserInfo.id);

  if (user == null) {
    throw new Error("User could not be found.");
  }

  return user;
};

/**
 * TODO:
 * @param req
 */
export function getTokenFromReq(req: Request): string | null {
  const authReq = req.headers.authorization;
  if (!authReq) {
    return null;
  }

  return authReq.replace("Bearer ", "");
};

export const customAuthChecker: AuthChecker<ContextType, ROLE> = (
  { context }: ResolverData<ContextType>,
  roles: ROLE[]
) => {
  if (!context.user) {
    return false;
  }

  return roles.length == 0 || context.currMembership !== undefined && roles.includes(context.currMembership.role);
};
