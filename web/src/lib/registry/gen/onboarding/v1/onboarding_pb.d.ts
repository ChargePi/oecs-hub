import * as jspb from 'google-protobuf'

import * as google_protobuf_empty_pb from 'google-protobuf/google/protobuf/empty_pb'; // proto import: "google/protobuf/empty.proto"
import * as preferences_v1_preferences_pb from '../../preferences/v1/preferences_pb'; // proto import: "preferences/v1/preferences.proto"


export class OptionEffects extends jspb.Message {
  getViewMode(): preferences_v1_preferences_pb.ViewMode;
  setViewMode(value: preferences_v1_preferences_pb.ViewMode): OptionEffects;

  getChatLayout(): preferences_v1_preferences_pb.ChatLayout;
  setChatLayout(value: preferences_v1_preferences_pb.ChatLayout): OptionEffects;

  getLandingPath(): string;
  setLandingPath(value: string): OptionEffects;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OptionEffects.AsObject;
  static toObject(includeInstance: boolean, msg: OptionEffects): OptionEffects.AsObject;
  static serializeBinaryToWriter(message: OptionEffects, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OptionEffects;
  static deserializeBinaryFromReader(message: OptionEffects, reader: jspb.BinaryReader): OptionEffects;
}

export namespace OptionEffects {
  export type AsObject = {
    viewMode: preferences_v1_preferences_pb.ViewMode;
    chatLayout: preferences_v1_preferences_pb.ChatLayout;
    landingPath: string;
  };
}

export class Option extends jspb.Message {
  getId(): string;
  setId(value: string): Option;

  getLabel(): string;
  setLabel(value: string): Option;

  getDescription(): string;
  setDescription(value: string): Option;

  getEffects(): OptionEffects | undefined;
  setEffects(value?: OptionEffects): Option;
  hasEffects(): boolean;
  clearEffects(): Option;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Option.AsObject;
  static toObject(includeInstance: boolean, msg: Option): Option.AsObject;
  static serializeBinaryToWriter(message: Option, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Option;
  static deserializeBinaryFromReader(message: Option, reader: jspb.BinaryReader): Option;
}

export namespace Option {
  export type AsObject = {
    id: string;
    label: string;
    description: string;
    effects?: OptionEffects.AsObject;
  };
}

export class Condition extends jspb.Message {
  getQuestionId(): string;
  setQuestionId(value: string): Condition;

  getOptionIdsList(): Array<string>;
  setOptionIdsList(value: Array<string>): Condition;
  clearOptionIdsList(): Condition;
  addOptionIds(value: string, index?: number): Condition;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Condition.AsObject;
  static toObject(includeInstance: boolean, msg: Condition): Condition.AsObject;
  static serializeBinaryToWriter(message: Condition, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Condition;
  static deserializeBinaryFromReader(message: Condition, reader: jspb.BinaryReader): Condition;
}

export namespace Condition {
  export type AsObject = {
    questionId: string;
    optionIdsList: Array<string>;
  };
}

export class Question extends jspb.Message {
  getId(): string;
  setId(value: string): Question;

  getLabel(): string;
  setLabel(value: string): Question;

  getTitle(): string;
  setTitle(value: string): Question;

  getHint(): string;
  setHint(value: string): Question;

  getKind(): QuestionKind;
  setKind(value: QuestionKind): Question;

  getOptionsList(): Array<Option>;
  setOptionsList(value: Array<Option>): Question;
  clearOptionsList(): Question;
  addOptions(value?: Option, index?: number): Option;

  getShowIf(): Condition | undefined;
  setShowIf(value?: Condition): Question;
  hasShowIf(): boolean;
  clearShowIf(): Question;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Question.AsObject;
  static toObject(includeInstance: boolean, msg: Question): Question.AsObject;
  static serializeBinaryToWriter(message: Question, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Question;
  static deserializeBinaryFromReader(message: Question, reader: jspb.BinaryReader): Question;
}

export namespace Question {
  export type AsObject = {
    id: string;
    label: string;
    title: string;
    hint: string;
    kind: QuestionKind;
    optionsList: Array<Option.AsObject>;
    showIf?: Condition.AsObject;
  };
}

export class Questionnaire extends jspb.Message {
  getQuestionsList(): Array<Question>;
  setQuestionsList(value: Array<Question>): Questionnaire;
  clearQuestionsList(): Questionnaire;
  addQuestions(value?: Question, index?: number): Question;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Questionnaire.AsObject;
  static toObject(includeInstance: boolean, msg: Questionnaire): Questionnaire.AsObject;
  static serializeBinaryToWriter(message: Questionnaire, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Questionnaire;
  static deserializeBinaryFromReader(message: Questionnaire, reader: jspb.BinaryReader): Questionnaire;
}

export namespace Questionnaire {
  export type AsObject = {
    questionsList: Array<Question.AsObject>;
  };
}

export class Answer extends jspb.Message {
  getQuestionId(): string;
  setQuestionId(value: string): Answer;

  getOptionIdsList(): Array<string>;
  setOptionIdsList(value: Array<string>): Answer;
  clearOptionIdsList(): Answer;
  addOptionIds(value: string, index?: number): Answer;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Answer.AsObject;
  static toObject(includeInstance: boolean, msg: Answer): Answer.AsObject;
  static serializeBinaryToWriter(message: Answer, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Answer;
  static deserializeBinaryFromReader(message: Answer, reader: jspb.BinaryReader): Answer;
}

export namespace Answer {
  export type AsObject = {
    questionId: string;
    optionIdsList: Array<string>;
  };
}

export class OnboardingProfile extends jspb.Message {
  getStatus(): OnboardingStatus;
  setStatus(value: OnboardingStatus): OnboardingProfile;

  getAnswersList(): Array<Answer>;
  setAnswersList(value: Array<Answer>): OnboardingProfile;
  clearAnswersList(): OnboardingProfile;
  addAnswers(value?: Answer, index?: number): Answer;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): OnboardingProfile.AsObject;
  static toObject(includeInstance: boolean, msg: OnboardingProfile): OnboardingProfile.AsObject;
  static serializeBinaryToWriter(message: OnboardingProfile, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): OnboardingProfile;
  static deserializeBinaryFromReader(message: OnboardingProfile, reader: jspb.BinaryReader): OnboardingProfile;
}

export namespace OnboardingProfile {
  export type AsObject = {
    status: OnboardingStatus;
    answersList: Array<Answer.AsObject>;
  };
}

export class GetOnboardingResponse extends jspb.Message {
  getProfile(): OnboardingProfile | undefined;
  setProfile(value?: OnboardingProfile): GetOnboardingResponse;
  hasProfile(): boolean;
  clearProfile(): GetOnboardingResponse;

  getQuestionnaire(): Questionnaire | undefined;
  setQuestionnaire(value?: Questionnaire): GetOnboardingResponse;
  hasQuestionnaire(): boolean;
  clearQuestionnaire(): GetOnboardingResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetOnboardingResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetOnboardingResponse): GetOnboardingResponse.AsObject;
  static serializeBinaryToWriter(message: GetOnboardingResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetOnboardingResponse;
  static deserializeBinaryFromReader(message: GetOnboardingResponse, reader: jspb.BinaryReader): GetOnboardingResponse;
}

export namespace GetOnboardingResponse {
  export type AsObject = {
    profile?: OnboardingProfile.AsObject;
    questionnaire?: Questionnaire.AsObject;
  };
}

export class CompleteOnboardingRequest extends jspb.Message {
  getAnswersList(): Array<Answer>;
  setAnswersList(value: Array<Answer>): CompleteOnboardingRequest;
  clearAnswersList(): CompleteOnboardingRequest;
  addAnswers(value?: Answer, index?: number): Answer;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CompleteOnboardingRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CompleteOnboardingRequest): CompleteOnboardingRequest.AsObject;
  static serializeBinaryToWriter(message: CompleteOnboardingRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CompleteOnboardingRequest;
  static deserializeBinaryFromReader(message: CompleteOnboardingRequest, reader: jspb.BinaryReader): CompleteOnboardingRequest;
}

export namespace CompleteOnboardingRequest {
  export type AsObject = {
    answersList: Array<Answer.AsObject>;
  };
}

export class CompleteOnboardingResponse extends jspb.Message {
  getProfile(): OnboardingProfile | undefined;
  setProfile(value?: OnboardingProfile): CompleteOnboardingResponse;
  hasProfile(): boolean;
  clearProfile(): CompleteOnboardingResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CompleteOnboardingResponse.AsObject;
  static toObject(includeInstance: boolean, msg: CompleteOnboardingResponse): CompleteOnboardingResponse.AsObject;
  static serializeBinaryToWriter(message: CompleteOnboardingResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CompleteOnboardingResponse;
  static deserializeBinaryFromReader(message: CompleteOnboardingResponse, reader: jspb.BinaryReader): CompleteOnboardingResponse;
}

export namespace CompleteOnboardingResponse {
  export type AsObject = {
    profile?: OnboardingProfile.AsObject;
  };
}

export class SkipOnboardingResponse extends jspb.Message {
  getProfile(): OnboardingProfile | undefined;
  setProfile(value?: OnboardingProfile): SkipOnboardingResponse;
  hasProfile(): boolean;
  clearProfile(): SkipOnboardingResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SkipOnboardingResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SkipOnboardingResponse): SkipOnboardingResponse.AsObject;
  static serializeBinaryToWriter(message: SkipOnboardingResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SkipOnboardingResponse;
  static deserializeBinaryFromReader(message: SkipOnboardingResponse, reader: jspb.BinaryReader): SkipOnboardingResponse;
}

export namespace SkipOnboardingResponse {
  export type AsObject = {
    profile?: OnboardingProfile.AsObject;
  };
}

export enum OnboardingStatus {
  ONBOARDING_STATUS_UNSPECIFIED = 0,
  ONBOARDING_STATUS_SKIPPED = 1,
  ONBOARDING_STATUS_COMPLETED = 2,
}
export enum QuestionKind {
  QUESTION_KIND_UNSPECIFIED = 0,
  QUESTION_KIND_SINGLE_CHOICE = 1,
  QUESTION_KIND_MULTIPLE_CHOICE = 2,
}
