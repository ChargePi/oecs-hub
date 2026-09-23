package promptsuggestion

import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
)

var tracer = otel.Tracer("promptsuggestion.service")

func topicAttr(topic Topic) attribute.KeyValue {
	return attribute.String("promptsuggestion.topic", string(topic))
}

func modeAttr(mode Mode) attribute.KeyValue {
	return attribute.String("promptsuggestion.mode", string(mode))
}

func groupSizeAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.group_size", n)
}

func groupCountAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.group_count", n)
}

func cacheHitAttr(hit bool) attribute.KeyValue {
	return attribute.Bool("promptsuggestion.cache_hit", hit)
}

// singleflightSharedAttr records whether this call got a regeneration another concurrent
// caller triggered, rather than triggering (and paying for) its own.
func singleflightSharedAttr(shared bool) attribute.KeyValue {
	return attribute.Bool("promptsuggestion.singleflight_shared", shared)
}

func poolSizeAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.pool_size", n)
}

func returnCountAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.return_count", n)
}

func suggestionCountAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.suggestion_count", n)
}

func factCountAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.fact_count", n)
}

func pairCountAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.pair_count", n)
}

// chargerTypeAttr renders the empty (unfiltered) chargerType as an explicit value rather than
// an empty string, so it reads clearly in a trace backend's attribute list/facets.
func chargerTypeAttr(chargerType string) attribute.KeyValue {
	if chargerType == "" {
		chargerType = "unfiltered"
	}

	return attribute.String("promptsuggestion.charger_type", chargerType)
}

func pageSizeAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.page_size", n)
}

func resultCountAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.result_count", n)
}

func retriedUnfilteredAttr(retried bool) attribute.KeyValue {
	return attribute.Bool("promptsuggestion.search_retried_unfiltered", retried)
}

func failedTopicsAttr(n int) attribute.KeyValue {
	return attribute.Int("promptsuggestion.failed_topic_count", n)
}
