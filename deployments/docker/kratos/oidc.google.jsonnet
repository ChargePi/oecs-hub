// Deliberately maps only email/name from Google's claims - userType/company are left
// unset so Kratos's native "complete missing required traits" step runs for OIDC
// signups too, same as email/password registration. See identity.schema.json.
local claims = std.extVar('claims');

{
  identity: {
    traits: {
      email: claims.email,
      [if 'name' in claims then 'name' else null]: claims.name,
    },
  },
}
