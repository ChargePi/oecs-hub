// Package promptsuggestion generates example chat prompts for the chat empty state: LLM-written
// text grounded in real catalog data pulled via the search_chargers MCP tool (internal/mcp),
// for three topics - general EV knowledge, chargers, and comparison. See Service for the
// cache-or-regenerate entry point callers use.
package promptsuggestion

// Topic identifies which of the three suggestion topics a Suggestion belongs to.
type Topic string

const (
	TopicGeneral    Topic = "general"
	TopicChargers   Topic = "chargers"
	TopicComparison Topic = "comparison"
)

// Topics lists every topic, in the order suggestions are generated/returned for an unfiltered
// request.
var Topics = []Topic{TopicGeneral, TopicChargers, TopicComparison}

// Suggestion is one LLM-generated example prompt for a topic.
type Suggestion struct {
	Topic Topic  `json:"topic"`
	Text  string `json:"text"`
}
