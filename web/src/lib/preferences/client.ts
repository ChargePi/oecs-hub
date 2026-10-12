import { normalizeAndDispatch } from '@/lib/errors'
import { PreferencesServiceClient } from '@/lib/registry/gen/preferences/v1/PreferencesServiceClientPb'
import {
  ChatLayout as ChatLayoutProto,
  Preferences as PreferencesProto,
  UnitSystem as UnitSystemProto,
  UpdatePreferencesRequest,
  ViewMode as ViewModeProto,
} from '@/lib/registry/gen/preferences/v1/preferences_pb'
import { Empty } from 'google-protobuf/google/protobuf/empty_pb'

import { DEFAULT_PREFERENCES, type ChatLayout, type Preferences } from './types'

const client = new PreferencesServiceClient('/api', null, null)

function mapError(err: unknown, context: string): never {
  normalizeAndDispatch(err, context, 'preferences request failed')
}

function fromProto(p: PreferencesProto | undefined): Preferences {
  if (!p) return DEFAULT_PREFERENCES

  const chatLayout: Record<ChatLayoutProto, ChatLayout> = {
    [ChatLayoutProto.CHAT_LAYOUT_UNSPECIFIED]: 'auto',
    [ChatLayoutProto.CHAT_LAYOUT_DRAWER]: 'drawer',
    [ChatLayoutProto.CHAT_LAYOUT_PAGE]: 'page',
  }

  return {
    currency: p.getCurrency() || DEFAULT_PREFERENCES.currency,
    unitSystem: p.getUnitSystem() === UnitSystemProto.UNIT_SYSTEM_IMPERIAL ? 'imperial' : 'metric',
    viewMode: p.getViewMode() === ViewModeProto.VIEW_MODE_SIMPLIFIED ? 'simplified' : 'advanced',
    chatLayout: chatLayout[p.getChatLayout()],
    language: p.getLanguage() || DEFAULT_PREFERENCES.language,
  }
}

function toProto(p: Preferences): PreferencesProto {
  const chatLayout: Record<ChatLayout, ChatLayoutProto> = {
    auto: ChatLayoutProto.CHAT_LAYOUT_UNSPECIFIED,
    drawer: ChatLayoutProto.CHAT_LAYOUT_DRAWER,
    page: ChatLayoutProto.CHAT_LAYOUT_PAGE,
  }

  return new PreferencesProto()
    .setCurrency(p.currency)
    .setUnitSystem(
      p.unitSystem === 'imperial'
        ? UnitSystemProto.UNIT_SYSTEM_IMPERIAL
        : UnitSystemProto.UNIT_SYSTEM_METRIC,
    )
    .setViewMode(
      p.viewMode === 'simplified'
        ? ViewModeProto.VIEW_MODE_SIMPLIFIED
        : ViewModeProto.VIEW_MODE_ADVANCED,
    )
    .setChatLayout(chatLayout[p.chatLayout])
    .setLanguage(p.language)
}

export async function getPreferences(): Promise<Preferences> {
  try {
    const resp = await client.getPreferences(new Empty(), {})
    return fromProto(resp.getPreferences())
  } catch (err) {
    mapError(err, 'getPreferences')
  }
}

export async function updatePreferences(p: Preferences): Promise<Preferences> {
  try {
    const resp = await client.updatePreferences(
      new UpdatePreferencesRequest().setPreferences(toProto(p)),
      {},
    )
    return fromProto(resp.getPreferences())
  } catch (err) {
    mapError(err, 'updatePreferences')
  }
}
