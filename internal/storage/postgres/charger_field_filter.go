package postgres

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/ChargePi/oecs-hub/internal/charger"
)

// fieldSegmentRe restricts field path segments to safe identifiers, since segments are
// interpolated directly into a jsonpath expression - values are never interpolated, they
// travel as jsonpath variables (see fieldFilterPredicate).
var fieldSegmentRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// fieldFilterPredicate builds a Postgres jsonpath expression (and its bound variables,
// as a jsonb object) matching FieldFilter.Field against any of FieldFilter.Values. Lax
// mode makes the path auto-unwrap arrays it passes through, so a path segment that is
// actually a repeated node (e.g. "hardware.connectors.type") matches if any element does.
func fieldFilterPredicate(f charger.FieldFilter) (path string, vars []byte, err error) {
	segments := strings.Split(f.Field, ".")
	for _, seg := range segments {
		if !fieldSegmentRe.MatchString(seg) {
			return "", nil, fmt.Errorf("invalid field %q: bad path segment %q", f.Field, seg)
		}
	}

	if len(f.Values) == 0 {
		return "", nil, fmt.Errorf("field %q: at least one value is required", f.Field)
	}

	varValues := make(map[string]any, len(f.Values))
	conds := make([]string, len(f.Values))

	for i, v := range f.Values {
		name := fmt.Sprintf("v%d", i)
		varValues[name] = typedJSONValue(v)
		conds[i] = "@ == $" + name
	}

	varsJSON, err := json.Marshal(varValues)
	if err != nil {
		return "", nil, fmt.Errorf("marshal field filter values: %w", err)
	}

	path = fmt.Sprintf("lax $.%s ? (%s)", strings.Join(segments, "."), strings.Join(conds, " || "))

	return path, varsJSON, nil
}

func priceRangePredicate(p charger.PriceRange) (path string, vars []byte, err error) {
	varValues := map[string]any{"currency": p.Currency}
	conds := []string{"@.currency == $currency"}

	if p.Min != nil {
		varValues["min"] = *p.Min
		conds = append(conds, "@.value >= $min")
	}

	if p.Max != nil {
		varValues["max"] = *p.Max
		conds = append(conds, "@.value <= $max")
	}

	varsJSON, err := json.Marshal(varValues)
	if err != nil {
		return "", nil, fmt.Errorf("marshal price range values: %w", err)
	}

	path = fmt.Sprintf(`lax $.pricing ? (@.pricingModel == "fixed").prices[*] ? (%s)`, strings.Join(conds, " && "))

	return path, varsJSON, nil
}

func protocolsPredicate(protocols []charger.ProtocolFilter) (path string, vars []byte, err error) {
	varValues := make(map[string]any, len(protocols)*4)
	conds := make([]string, len(protocols))

	for i, p := range protocols {
		n := fmt.Sprintf("n%d", i)
		varValues[n] = p.Name

		if p.Version == "" {
			conds[i] = "@.name == $" + n
			continue
		}

		v, dot, colon := fmt.Sprintf("v%d", i), fmt.Sprintf("d%d", i), fmt.Sprintf("c%d", i)
		varValues[v] = p.Version
		varValues[dot] = p.Version + "."
		varValues[colon] = p.Version + ":"
		conds[i] = fmt.Sprintf("(@.name == $%s && (@.version == $%s || @.version starts with $%s || @.version starts with $%s))", n, v, dot, colon)
	}

	varsJSON, err := json.Marshal(varValues)
	if err != nil {
		return "", nil, fmt.Errorf("marshal protocol filter values: %w", err)
	}

	path = fmt.Sprintf("lax $.software.protocols ? (%s)", strings.Join(conds, " || "))

	return path, varsJSON, nil
}

// typedJSONValue best-effort coerces a user-supplied filter value to the JSON type it's
// likely comparing against, since jsonpath equality is type-sensitive (a JSON boolean
// never equals the string "true"). OECS enum/string fields don't collide with this - they
// aren't literal "true"/"false"/numbers.
func typedJSONValue(s string) any {
	if b, err := strconv.ParseBool(s); err == nil {
		return b
	}

	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return f
	}

	return s
}
