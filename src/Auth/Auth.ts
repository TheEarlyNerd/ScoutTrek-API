import * as validator from "email-validator";
import { UserModel } from "../../models/models";
import { Field, InputType, ObjectType, ID, Resolver, Mutation, Args } from "type-graphql";
import * as authFns from "../utils/Auth";
import { getIdFromRef } from "../utils/db";
import { User } from "../User/User";

@InputType()
export class LoginInput {
  @Field()
  email!: string;
  @Field()
  password!: string;
  @Field({ nullable: true })
  expoNotificationToken?: string;
}

@InputType()
export class SignupInput {
  @Field()
  name!: string;
  @Field()
  email!: string;
  @Field()
  password!: string;
  @Field()
  passwordConfirm!: string;
  @Field({ nullable: true })
  expoNotificationToken?: string;
  @Field({ nullable: true })
  phone?: string;
  @Field({ nullable: true })
  birthday?: string;
}

@ObjectType()
export class SignupPayload {
  @Field()
  token!: string;
  @Field(type => User)
  user!: User;
  @Field()
  noGroups!: boolean;
}

@ObjectType()
export class LoginPayload {
  @Field()
  token!: string;
  @Field(type => User)
  user!: User;
  @Field(type => ID)
  groupID!: string;
}

@Resolver()
export class AuthResolver {

  @Mutation(returns => SignupPayload)
  async signup(
    @Args() input: SignupInput
  ): Promise<SignupPayload> {
    if (!validator.validate(input.email)) {
      throw new Error("Please enter a valid email.");
    }

    const userInput = {
      name: input.name,
      email: input.email,
      expoNotificationToken: input.expoNotificationToken,
      password: input.password,
      passwordConfirm: input.passwordConfirm,
    };

    // TODO: double check this return type
    const user = await UserModel.create({ ...userInput });

    const token = authFns.createToken({
      id: user._id
    });

    return {
      user,
      token,
      noGroups: true
    };
  }

  @Mutation(returns => LoginPayload)
  async login(
    @Args() input: LoginInput
  ): Promise<LoginPayload> {
    const { email, password } = input;

    if (!email || !password) {
      throw new Error("Please provide an email and password.");
    }

    const user = await UserModel.findOne({ email }).select("+password");

    if (!user || !(await user.isValidPassword(password, user.password))) {
      throw new Error("Invalid login");
    }

    if (input.expoNotificationToken) {
      if (input.expoNotificationToken !== user.expoNotificationToken) {
        await UserModel.findByIdAndUpdate(user._id, {
          expoNotificationToken: input.expoNotificationToken,
        });
      }
    }

    const token = authFns.createToken({ id: user._id.toString() });
    return {
      token,
      user,
      groupID: getIdFromRef(user.groups[0]).toString()
    };
  }
}