import { ExclusiveGatewayValidationResult } from '../components/bpmn-editor/bpmn-editor.types';

const BPMN_NAMESPACE = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

export function validateExclusiveGatewayXml(xml: string): ExclusiveGatewayValidationResult {
  if (!xml.trim()) {
    return {
      valid: false,
      message: 'El XML BPMN esta vacio.',
      invalidGatewayIds: [],
    };
  }

  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    return {
      valid: false,
      message: 'El XML BPMN no es valido.',
      invalidGatewayIds: [],
    };
  }

  const gateways = Array.from(document.getElementsByTagNameNS(BPMN_NAMESPACE, 'exclusiveGateway'));
  const invalidGatewayIds: string[] = [];

  for (const gateway of gateways) {
    const gatewayId = gateway.getAttribute('id')?.trim() || 'ExclusiveGateway sin id';
    const outgoingFlows = Array.from(document.getElementsByTagNameNS(BPMN_NAMESPACE, 'sequenceFlow'))
      .filter((flow) => flow.getAttribute('sourceRef') === gateway.getAttribute('id'));

    if (outgoingFlows.length <= 1) {
      continue;
    }

    const defaultFlowId = gateway.getAttribute('default')?.trim() || '';
    const defaultFlow = defaultFlowId
      ? outgoingFlows.find((flow) => flow.getAttribute('id') === defaultFlowId) ?? null
      : null;

    if (defaultFlowId && !defaultFlow) {
      return {
        valid: false,
        message: `Exclusive Gateway '${gatewayId}' referencia como default al flujo '${defaultFlowId}', pero ese flujo no existe o no sale de ese gateway.`,
        invalidGatewayIds: [gatewayId],
      };
    }

    const invalidFlows = outgoingFlows
      .filter((flow) => !defaultFlowId || flow.getAttribute('id') !== defaultFlowId)
      .filter((flow) => !hasConditionExpression(flow))
      .map((flow) => flow.getAttribute('id')?.trim() || 'sequenceFlow sin id');

    if (invalidFlows.length > 0) {
      invalidGatewayIds.push(gatewayId);

      if (!defaultFlowId) {
        return {
          valid: false,
          message: `Exclusive Gateway '${gatewayId}' tiene salidas sin conditionExpression ni flujo default: ${invalidFlows.join(', ')}.`,
          invalidGatewayIds,
        };
      }

      return {
        valid: false,
        message: `Exclusive Gateway '${gatewayId}' tiene salidas sin conditionExpression fuera del flujo default '${defaultFlowId}': ${invalidFlows.join(', ')}.`,
        invalidGatewayIds,
      };
    }
  }

  return {
    valid: true,
    message: '',
    invalidGatewayIds,
  };
}

function hasConditionExpression(flow: Element): boolean {
  const condition = flow.getElementsByTagNameNS(BPMN_NAMESPACE, 'conditionExpression')[0];
  return !!condition?.textContent?.trim();
}
