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

export type ExclusiveGatewayValidationResult = {
  valid: boolean;
  message: string;
  invalidGatewayIds: string[];
};
