// Fire-and-forget registration webhook body. plan_code comes from transient_payload
// (not a trait) and is re-validated server-side.
function(ctx)
  local traits = std.get(ctx.identity, 'traits', {});
  local billingAddress = std.get(traits, 'billingAddress', {});
  local company = std.get(traits, 'company', {});
  local flow = std.get(ctx, 'flow', {});
  local transientPayload = std.get(flow, 'transient_payload', {});
  {
    identity_id: ctx.identity.id,
    email: traits.email,
    schema_id: ctx.identity.schema_id,
    name: std.get(traits, 'name', ''),
    legal_name: std.get(company, 'name', ''),
    country: std.get(company, 'country', std.get(billingAddress, 'country', '')),
    address_line1: std.get(company, 'streetAddress', std.get(billingAddress, 'streetAddress', '')),
    zipcode: std.get(company, 'postalCode', std.get(billingAddress, 'postalCode', '')),
    plan_code: std.get(transientPayload, 'plan_code', ''),
  }
