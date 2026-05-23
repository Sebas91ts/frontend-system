import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isLabel } from 'bpmn-js/lib/util/LabelUtil';
import { append as svgAppend, attr as svgAttr, classes as svgClasses, create as svgCreate } from 'tiny-svg';
import {
  getCirclePath,
  getDiamondPath,
  getRectPath,
  getRoundRectPath,
} from 'bpmn-js/lib/draw/BpmnRenderUtil';

const UML_RENDER_PRIORITY = 2500;
function umlStroke() {
  return '#111827';
}

function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
  attrs: Record<string, unknown> = {},
): SVGElement {
  return svgCreate('rect', {
    x,
    y,
    width,
    height,
    ...attrs,
  });
}

function createCircle(
  cx: number,
  cy: number,
  r: number,
  attrs: Record<string, unknown> = {},
): SVGElement {
  return svgCreate('circle', {
    cx,
    cy,
    r,
    ...attrs,
  });
}

function createPolygon(points: string, attrs: Record<string, unknown> = {}): SVGElement {
  return svgCreate('polygon', {
    points,
    ...attrs,
  });
}

function appendText(
  parent: SVGElement,
  textRenderer: any,
  text: string,
  box: { x: number; y: number; width: number; height: number },
  extraClasses: string[] = [],
  styleOverrides: Record<string, string | number> = {},
): void {
  const rendered = textRenderer.createText(text || '', {
    box,
    align: 'center-middle',
    padding: 8,
    style: {
      fill: umlStroke(),
      fontSize: '15px',
      fontWeight: 700,
      fontFamily: '"Segoe UI", Arial, sans-serif',
      lineHeight: 1.15,
      ...styleOverrides,
    },
  });

  svgClasses(rendered).add('djs-label');
  for (const cssClass of extraClasses) {
    svgClasses(rendered).add(cssClass);
  }
  svgAppend(parent, rendered);
}

export default function UmlActivityRenderer(this: any, eventBus: any, textRenderer: any) {
  BaseRenderer.call(this, eventBus, UML_RENDER_PRIORITY);
  this.textRenderer = textRenderer;
}

UmlActivityRenderer.prototype = Object.create((BaseRenderer as any).prototype);
UmlActivityRenderer.prototype.constructor = UmlActivityRenderer;

UmlActivityRenderer.prototype.canRender = function (element: any) {
  if (!element || isLabel(element)) {
    return false;
  }

  return (
    is(element, 'bpmn:UserTask') ||
    is(element, 'bpmn:StartEvent') ||
    is(element, 'bpmn:EndEvent') ||
    is(element, 'bpmn:ExclusiveGateway') ||
    is(element, 'bpmn:ParallelGateway')
  );
};

UmlActivityRenderer.prototype.drawShape = function (parentGfx: SVGElement, shape: any) {
  if (is(shape, 'bpmn:UserTask')) {
    const action = createRect(0, 0, shape.width, shape.height, {
      rx: 12,
      ry: 12,
      fill: '#f8fbff',
      stroke: '#2563eb',
      strokeWidth: 2,
    });
    svgClasses(action).add('uml-action-shape');
    svgAppend(parentGfx, action);
    appendText(parentGfx, this.textRenderer, shape.businessObject?.name || '', {
      x: 10,
      y: 10,
      width: Math.max(shape.width - 20, 64),
      height: Math.max(shape.height - 20, 36),
    }, [], {
      fontSize: '15px',
      fontWeight: 700,
    });
    return action;
  }

  if (is(shape, 'bpmn:StartEvent')) {
    const radius = Math.min(shape.width, shape.height) / 2 - 3;
    const circle = createCircle(shape.width / 2, shape.height / 2, radius, {
      fill: '#dff8ea',
      stroke: '#10b981',
      strokeWidth: 2.2,
    });
    svgAppend(parentGfx, circle);
    appendText(parentGfx, this.textRenderer, shape.businessObject?.name || 'Inicio', {
      x: -(shape.width * 0.6),
      y: shape.height + 6,
      width: shape.width * 2.2,
      height: 28,
    }, [], {
      fontSize: '12px',
      fontWeight: 800,
    });
    return circle;
  }

  if (is(shape, 'bpmn:EndEvent')) {
    const radius = Math.min(shape.width, shape.height) / 2 - 3;
    const outer = createCircle(shape.width / 2, shape.height / 2, radius, {
      fill: '#ffe4e6',
      stroke: '#ef4444',
      strokeWidth: 2.4,
    });
    svgAppend(parentGfx, outer);
    appendText(parentGfx, this.textRenderer, shape.businessObject?.name || 'Fin', {
      x: -(shape.width * 0.55),
      y: shape.height + 6,
      width: shape.width * 2.1,
      height: 28,
    }, [], {
      fontSize: '12px',
      fontWeight: 800,
    });
    return outer;
  }

  if (is(shape, 'bpmn:ExclusiveGateway')) {
    const halfWidth = shape.width / 2;
    const halfHeight = shape.height / 2;
    const diamond = createPolygon(
      `${halfWidth},0 ${shape.width},${halfHeight} ${halfWidth},${shape.height} 0,${halfHeight}`,
      {
        fill: '#fffdf8',
        stroke: '#d97706',
        strokeWidth: 2.35,
      },
    );
    svgAppend(parentGfx, diamond);

    const inset = Math.max(Math.round(shape.width * 0.18), 7);
    const innerDiamond = createPolygon(
      `${halfWidth},${inset} ${shape.width - inset},${halfHeight} ${halfWidth},${shape.height - inset} ${inset},${halfHeight}`,
      {
        fill: 'none',
        stroke: '#f59e0b',
        strokeWidth: 1.2,
        opacity: 0.55,
      },
    );
    svgAppend(parentGfx, innerDiamond);

    appendText(parentGfx, this.textRenderer, shape.businessObject?.name || '', {
      x: -(shape.width * 0.42),
      y: -28,
      width: Math.max(shape.width * 1.85, 88),
      height: 24,
    }, [], {
      fontSize: '12px',
      fontWeight: 800,
    });
    return diamond;
  }

  if (is(shape, 'bpmn:ParallelGateway')) {
    const barWidth = 12;
    const bar = createRect((shape.width - barWidth) / 2, 2, barWidth, shape.height - 4, {
      fill: '#111827',
      stroke: '#111827',
      strokeWidth: 1,
      rx: 1,
      ry: 1,
    });
    svgAppend(parentGfx, bar);
    return bar;
  }

  const fallback = createRect(0, 0, shape.width, shape.height, {
    fill: '#ffffff',
    stroke: umlStroke(),
    strokeWidth: 1.5,
  });
  svgAppend(parentGfx, fallback);
  return fallback;
};

UmlActivityRenderer.prototype.getShapePath = function (shape: any) {
  if (is(shape, 'bpmn:UserTask')) {
    return getRoundRectPath(shape, 12);
  }

  if (is(shape, 'bpmn:StartEvent') || is(shape, 'bpmn:EndEvent')) {
    return getCirclePath(shape);
  }

  if (is(shape, 'bpmn:ExclusiveGateway')) {
    return getDiamondPath(shape);
  }

  return getRectPath(shape);
};

UmlActivityRenderer.prototype.drawConnection = function () {
  return undefined;
};

UmlActivityRenderer.prototype.getConnectionPath = function (connection: any) {
  const waypoints = connection.waypoints || [];
  if (!waypoints.length) {
    return '';
  }

  const [first, ...rest] = waypoints;
  return `M ${first.x} ${first.y} ` + rest.map((point: any) => `L ${point.x} ${point.y}`).join(' ');
};

(UmlActivityRenderer as any).$inject = ['eventBus', 'textRenderer'];
