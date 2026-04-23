export type LaneValidationResult = {
  valid: boolean;
  missingLaneNames: string[];
  message: string;
};

export type LaneAreaBinding = {
  areaId: string;
  areaName: string;
  matchedByName: boolean;
};

export type SequenceFlowTechnicalState = {
  flowId: string;
  sourceGatewayId: string;
  sourceGatewayLabel: string;
  targetId: string;
  targetLabel: string;
  conditionExpression: string;
  isDefaultFlow: boolean;
};

export type ConditionFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'checklist'
  | 'file';

export type ConditionFieldValueOption = {
  label: string;
  value: string;
};

export type ConditionFieldOption = {
  name: string;
  label: string;
  type: ConditionFieldType;
  options: string[];
  optionItems: ConditionFieldValueOption[];
};

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'before'
  | 'after'
  | 'exists'
  | 'not_exists'
  | 'is_true'
  | 'is_false';

export type ConditionOperatorOption = {
  value: ConditionOperator;
  label: string;
  requiresValue: boolean;
};

export type ExclusiveGatewayValidationResult = {
  valid: boolean;
  message: string;
  invalidGatewayIds: string[];
};
