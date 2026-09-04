package grpc

import (
	"encoding/json"
	"sort"

	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/ChargePi/oecs-hub/internal/oecsspec"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func chargerTypeToProto(t string) registryv1.ChargerType {
	switch t {
	case oecsspec.ModelTypeAC:
		return registryv1.ChargerType_CHARGER_TYPE_AC
	case oecsspec.ModelTypeDC:
		return registryv1.ChargerType_CHARGER_TYPE_DC
	case oecsspec.ModelTypePortableEVSE:
		return registryv1.ChargerType_CHARGER_TYPE_PORTABLE_EVSE
	case oecsspec.ModelTypeWireless:
		return registryv1.ChargerType_CHARGER_TYPE_WIRELESS
	default:
		return registryv1.ChargerType_CHARGER_TYPE_UNSPECIFIED
	}
}

func chargerTypeToDomain(t registryv1.ChargerType) string {
	switch t {
	case registryv1.ChargerType_CHARGER_TYPE_AC:
		return oecsspec.ModelTypeAC
	case registryv1.ChargerType_CHARGER_TYPE_DC:
		return oecsspec.ModelTypeDC
	case registryv1.ChargerType_CHARGER_TYPE_PORTABLE_EVSE:
		return oecsspec.ModelTypePortableEVSE
	case registryv1.ChargerType_CHARGER_TYPE_WIRELESS:
		return oecsspec.ModelTypeWireless
	default:
		return ""
	}
}

func modelStatusToProto(s string) registryv1.ModelStatus {
	switch s {
	case oecsspec.ModelStatusPreRelease:
		return registryv1.ModelStatus_MODEL_STATUS_PRE_RELEASE
	case oecsspec.ModelStatusActive:
		return registryv1.ModelStatus_MODEL_STATUS_ACTIVE
	case oecsspec.ModelStatusDiscontinued:
		return registryv1.ModelStatus_MODEL_STATUS_DISCONTINUED
	case oecsspec.ModelStatusEndOfLife:
		return registryv1.ModelStatus_MODEL_STATUS_END_OF_LIFE
	default:
		return registryv1.ModelStatus_MODEL_STATUS_UNSPECIFIED
	}
}

var connectorTypeToProtoMap = map[string]registryv1.ConnectorType{
	oecsspec.ConnectorTypeType1J1772:         registryv1.ConnectorType_CONNECTOR_TYPE_TYPE1_J1772,
	oecsspec.ConnectorTypeType2Mennekes:      registryv1.ConnectorType_CONNECTOR_TYPE_TYPE2_MENNEKES,
	oecsspec.ConnectorTypeType3A:             registryv1.ConnectorType_CONNECTOR_TYPE_TYPE3A,
	oecsspec.ConnectorTypeCCS1Combo1:         registryv1.ConnectorType_CONNECTOR_TYPE_CCS1_COMBO1,
	oecsspec.ConnectorTypeCCS2Combo2:         registryv1.ConnectorType_CONNECTOR_TYPE_CCS2_COMBO2,
	oecsspec.ConnectorTypeCHAdeMO:            registryv1.ConnectorType_CONNECTOR_TYPE_CHADEMO,
	oecsspec.ConnectorTypeGBTAc:              registryv1.ConnectorType_CONNECTOR_TYPE_GBT_AC,
	oecsspec.ConnectorTypeGBTDc:              registryv1.ConnectorType_CONNECTOR_TYPE_GBT_DC,
	oecsspec.ConnectorTypeNACSTesla:          registryv1.ConnectorType_CONNECTOR_TYPE_NACS_TESLA,
	oecsspec.ConnectorTypeDomesticSocket:     registryv1.ConnectorType_CONNECTOR_TYPE_DOMESTIC_SOCKET,
	oecsspec.ConnectorTypeIndustrialIEC60309: registryv1.ConnectorType_CONNECTOR_TYPE_INDUSTRIAL_IEC60309,
	oecsspec.ConnectorTypeMCS:                registryv1.ConnectorType_CONNECTOR_TYPE_MCS_MEGAWATT_CHARGING_SYSTEM,
	oecsspec.ConnectorTypeOther:              registryv1.ConnectorType_CONNECTOR_TYPE_OTHER,
}

var connectorTypeToDomainMap = func() map[registryv1.ConnectorType]string {
	m := make(map[registryv1.ConnectorType]string, len(connectorTypeToProtoMap))
	for k, v := range connectorTypeToProtoMap {
		m[v] = k
	}

	return m
}()

func connectorTypeToProto(t string) registryv1.ConnectorType {
	if pt, ok := connectorTypeToProtoMap[t]; ok {
		return pt
	}

	return registryv1.ConnectorType_CONNECTOR_TYPE_UNSPECIFIED
}

func connectorTypeToDomain(t registryv1.ConnectorType) string {
	return connectorTypeToDomainMap[t]
}

func connectorTypesToProto(types []string) []registryv1.ConnectorType {
	if len(types) == 0 {
		return nil
	}

	out := make([]registryv1.ConnectorType, 0, len(types))
	for _, t := range types {
		out = append(out, connectorTypeToProto(t))
	}

	return out
}

func submissionStatusToProto(s charger.Status) registryv1.SubmissionStatus {
	switch s {
	case charger.StatusSubmitted:
		return registryv1.SubmissionStatus_SUBMISSION_STATUS_SUBMITTED
	case charger.StatusVerified:
		return registryv1.SubmissionStatus_SUBMISSION_STATUS_VERIFIED
	case charger.StatusRejected:
		return registryv1.SubmissionStatus_SUBMISSION_STATUS_REJECTED
	default:
		return registryv1.SubmissionStatus_SUBMISSION_STATUS_UNSPECIFIED
	}
}

func submissionStatusToDomain(s registryv1.SubmissionStatus) charger.Status {
	switch s {
	case registryv1.SubmissionStatus_SUBMISSION_STATUS_SUBMITTED:
		return charger.StatusSubmitted
	case registryv1.SubmissionStatus_SUBMISSION_STATUS_VERIFIED:
		return charger.StatusVerified
	case registryv1.SubmissionStatus_SUBMISSION_STATUS_REJECTED:
		return charger.StatusRejected
	default:
		return ""
	}
}

// ratingsToProto decodes a Charger's denormalized ratings JSON into the proto list,
// sorted by category name for a stable response order.
func ratingsToProto(raw []byte) []*registryv1.CategoryRating {
	if len(raw) == 0 {
		return nil
	}

	var summary charger.RatingsSummary
	if err := json.Unmarshal(raw, &summary); err != nil || len(summary) == 0 {
		return nil
	}

	return ratingsSummaryToProto(summary)
}

// ratingsSummaryToProto converts an already-decoded RatingsSummary into the proto list,
// sorted by category name for a stable response order.
func ratingsSummaryToProto(summary charger.RatingsSummary) []*registryv1.CategoryRating {
	names := make([]string, 0, len(summary))
	for name := range summary {
		names = append(names, name)
	}

	sort.Strings(names)

	out := make([]*registryv1.CategoryRating, 0, len(names))
	for _, name := range names {
		score := summary[name]
		out = append(out, &registryv1.CategoryRating{
			CategoryName: name,
			Average:      score.Average,
			Count:        score.Count,
		})
	}

	return out
}

func chargerToProtoSummary(c *charger.Charger) *registryv1.ChargerVariantSummary {
	summary := &registryv1.ChargerVariantSummary{
		Id:               c.ID.String(),
		ManufacturerName: c.ManufacturerName,
		ModelName:        c.ModelName,
		ModelStatus:      modelStatusToProto(c.ModelStatus),
		ChargerType:      chargerTypeToProto(c.ChargerType),
		ConnectorTypes:   connectorTypesToProto(c.ConnectorTypes),
		Status:           submissionStatusToProto(c.Status),
		Ratings:          ratingsToProto(c.Ratings),
	}
	if c.ManufacturerID != nil {
		summary.ManufacturerId = c.ManufacturerID.String()
	}

	if c.Series != "" {
		summary.Series = &c.Series
	}

	if c.MaxPowerWatts != nil {
		kw := *c.MaxPowerWatts / 1000
		summary.MaxPowerKw = &kw
	}

	if c.ProductImageURL != "" {
		summary.ProductImageUrl = &c.ProductImageURL
	}

	return summary
}

func chargersToProtoSummaries(chargers []*charger.Charger) []*registryv1.ChargerVariantSummary {
	out := make([]*registryv1.ChargerVariantSummary, len(chargers))
	for i, c := range chargers {
		out[i] = chargerToProtoSummary(c)
	}

	return out
}

func chargerToProto(c *charger.Charger) *registryv1.ChargerVariant {
	return &registryv1.ChargerVariant{
		Summary:   chargerToProtoSummary(c),
		Spec:      c.Spec,
		CreatedAt: timestamppb.New(c.CreatedAt),
		UpdatedAt: timestamppb.New(c.UpdatedAt),
	}
}

func chargersToProto(chargers []*charger.Charger) []*registryv1.ChargerVariant {
	out := make([]*registryv1.ChargerVariant, len(chargers))
	for i, c := range chargers {
		out[i] = chargerToProto(c)
	}

	return out
}

func manufacturerToProto(m *manufacturer.Manufacturer) *registryv1.Manufacturer {
	proto := &registryv1.Manufacturer{
		Id:   m.ID.String(),
		Name: m.Name,
		Contact: &registryv1.Contact{
			Name:    strPtrOrNil(m.Contact.Name),
			Email:   strPtrOrNil(m.Contact.Email),
			Phone:   strPtrOrNil(m.Contact.Phone),
			Website: strPtrOrNil(m.Contact.Website),
		},
	}
	if m.Country != "" {
		proto.Country = &m.Country
	}

	return proto
}

func manufacturerSummaryToProto(s *manufacturer.Summary) *registryv1.ManufacturerSummary {
	return &registryv1.ManufacturerSummary{
		Manufacturer: manufacturerToProto(&s.Manufacturer),
		ProductCount: s.ProductCount,
		VariantCount: s.VariantCount,
	}
}

func manufacturerSummariesToProto(summaries []*manufacturer.Summary) []*registryv1.ManufacturerSummary {
	out := make([]*registryv1.ManufacturerSummary, len(summaries))
	for i, s := range summaries {
		out[i] = manufacturerSummaryToProto(s)
	}

	return out
}

func contactToDomain(c *registryv1.Contact) manufacturer.Contact {
	if c == nil {
		return manufacturer.Contact{}
	}

	return manufacturer.Contact{
		Name:    c.GetName(),
		Email:   c.GetEmail(),
		Phone:   c.GetPhone(),
		Website: c.GetWebsite(),
	}
}

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}

	return &s
}
