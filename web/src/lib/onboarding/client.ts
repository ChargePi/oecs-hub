import { normalizeAndDispatch } from '@/lib/errors'
import type { ChatLayout, ViewMode } from '@/lib/preferences/types'
import { OnboardingServiceClient } from '@/lib/registry/gen/onboarding/v1/OnboardingServiceClientPb'
import {
  Answer as AnswerProto,
  CompleteOnboardingRequest,
  OnboardingProfile as OnboardingProfileProto,
  OnboardingStatus as OnboardingStatusProto,
  OptionEffects as OptionEffectsProto,
  Question as QuestionProto,
  QuestionKind as QuestionKindProto,
} from '@/lib/registry/gen/onboarding/v1/onboarding_pb'
import {
  ChatLayout as ChatLayoutProto,
  ViewMode as ViewModeProto,
} from '@/lib/registry/gen/preferences/v1/preferences_pb'
import { Empty } from 'google-protobuf/google/protobuf/empty_pb'

import type {
  Onboarding,
  OnboardingAnswers,
  OnboardingProfile,
  OnboardingStatus,
  OptionEffects,
  Question,
} from './types'

const client = new OnboardingServiceClient('/api', null, null)

const STATUS: Record<OnboardingStatusProto, OnboardingStatus> = {
  [OnboardingStatusProto.ONBOARDING_STATUS_UNSPECIFIED]: 'pending',
  [OnboardingStatusProto.ONBOARDING_STATUS_SKIPPED]: 'skipped',
  [OnboardingStatusProto.ONBOARDING_STATUS_COMPLETED]: 'completed',
}

const VIEW_MODE: Record<ViewModeProto, ViewMode | undefined> = {
  [ViewModeProto.VIEW_MODE_UNSPECIFIED]: undefined,
  [ViewModeProto.VIEW_MODE_SIMPLIFIED]: 'simplified',
  [ViewModeProto.VIEW_MODE_ADVANCED]: 'advanced',
}

const CHAT_LAYOUT: Record<ChatLayoutProto, ChatLayout | undefined> = {
  [ChatLayoutProto.CHAT_LAYOUT_UNSPECIFIED]: undefined,
  [ChatLayoutProto.CHAT_LAYOUT_DRAWER]: 'drawer',
  [ChatLayoutProto.CHAT_LAYOUT_PAGE]: 'page',
}

function mapError(err: unknown, context: string): never {
  normalizeAndDispatch(err, context, 'onboarding request failed')
}

function profileFromProto(p: OnboardingProfileProto | undefined): OnboardingProfile {
  const answers: OnboardingAnswers = {}
  for (const answer of p?.getAnswersList() ?? []) {
    answers[answer.getQuestionId()] = answer.getOptionIdsList()
  }

  return {
    status: p ? STATUS[p.getStatus()] : 'pending',
    answers,
  }
}

function effectsFromProto(e: OptionEffectsProto | undefined): OptionEffects {
  if (!e) return {}

  return {
    viewMode: VIEW_MODE[e.getViewMode()],
    chatLayout: CHAT_LAYOUT[e.getChatLayout()],
    landingPath: e.getLandingPath() || undefined,
  }
}

function questionFromProto(q: QuestionProto): Question {
  const showIf = q.getShowIf()

  return {
    id: q.getId(),
    label: q.getLabel(),
    title: q.getTitle(),
    hint: q.getHint() || undefined,
    kind: q.getKind() === QuestionKindProto.QUESTION_KIND_MULTIPLE_CHOICE ? 'multiple' : 'single',
    options: q.getOptionsList().map((o) => ({
      id: o.getId(),
      label: o.getLabel(),
      description: o.getDescription() || undefined,
      effects: effectsFromProto(o.getEffects()),
    })),
    showIf: showIf && {
      questionId: showIf.getQuestionId(),
      optionIds: showIf.getOptionIdsList(),
    },
  }
}

export async function getOnboarding(): Promise<Onboarding> {
  try {
    const resp = await client.getOnboarding(new Empty(), {})
    return {
      profile: profileFromProto(resp.getProfile()),
      questions: resp.getQuestionnaire()?.getQuestionsList().map(questionFromProto) ?? [],
    }
  } catch (err) {
    mapError(err, 'getOnboarding')
  }
}

export async function completeOnboarding(answers: OnboardingAnswers): Promise<OnboardingProfile> {
  try {
    const req = new CompleteOnboardingRequest().setAnswersList(
      Object.entries(answers).map(([questionId, optionIds]) =>
        new AnswerProto().setQuestionId(questionId).setOptionIdsList(optionIds),
      ),
    )
    const resp = await client.completeOnboarding(req, {})
    return profileFromProto(resp.getProfile())
  } catch (err) {
    mapError(err, 'completeOnboarding')
  }
}

export async function skipOnboarding(): Promise<OnboardingProfile> {
  try {
    const resp = await client.skipOnboarding(new Empty(), {})
    return profileFromProto(resp.getProfile())
  } catch (err) {
    mapError(err, 'skipOnboarding')
  }
}
