// Ory Permission Language namespace config for Keto. Defines the single "role"
// namespace used to gate AdminService: an identity is admin iff it's a member of the
// "admin" Role object. See deployments/docker/oathkeeper/access-rules.yml's
// admin-service rule and the plan doc's §1.8 for the write-side bootstrap step.
//
// TODO(verify): confirm this OPL syntax and the resulting relation-tuple shape
// (namespace/object/relation/subject_id) against the pinned Keto version - Keto's OPL
// has evolved and this is written from documented patterns, not tested locally yet.

import { Namespace } from '@ory/keto-namespace-types'

class Identity implements Namespace {}

class Role implements Namespace {
  related: {
    members: Identity[]
  }
}
