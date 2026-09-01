// Deliberately maps only email/name from Google's claims - company/billingAddress are
// left unset so Kratos's native "complete missing required traits" step runs for OIDC
// signups too, same as email/password registration. Schema selection (identitySchema on
// the registration flow) happens before this mapper runs - see
// identity.manufacturer.schema.json / identity.individual.schema.json.
local claims = std.extVar('claims');

{
  identity: {
    traits: {
      email: claims.email,
      [if 'name' in claims then 'name' else null]: claims.name,
    },
  },
}
