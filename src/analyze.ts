import * as periscopic from "periscopic";
import * as estreewalker from "estree-walker";

export default function analyze(ast: { script: any; html: any[] }) {
  const result = {
    variables: new Set(),
    willChange: new Set(),
    willUseInTemplate: new Set(),
  };

  const { scope: rootScope, map } = periscopic.analyze(ast.script);
  result.variables = new Set(rootScope.declarations.key);
  result.map = map;
  result.rootScope = rootScope;

  let currentScope = rootScope;
  //DFS manner search
  estreewalker.walk(ast.script, {
    enter(node: { type: string; argument: { name: unknown } }) {
      if (map.has(node)) {
        currentScope = map.get(node);
      }
      if (
        node.type === "UpdateExpression" &&
        currentScope.find_owner(node.argument.name) === rootScope
      ) {
        result.willChange.add(node.argument.name);
      }
    },
    leave(node: any) {
      if (map.has(node)) {
        currentScope = currentScope.parent;
      }
    },
  });

  function traverse(fragment: {
    type: any;
    children: any[];
    attributes: { forEcah: (arg0: (attribute: any) => void) => void };
    value: { name: unknown };
    expression: { name: unknown };
  }) {
    switch (fragment.type) {
      case "Element":
        fragment.children.forEach((child: any) => traverse(child));
        fragment.attributes.forEcah((attribute: any) => traverse(attribute));
        break;
      case "Attribute":
        //assume that the all the value of the attributes that we are using template
        result.willUseInTemplate.add(fragment.value.name);
        break;
      case "Expression":
        result.willUseInTemplate.add(fragment.expression.name);
        break;
    }
  }

  ast.html.forEach((fragment: any) => traverse(fragment));

  return result;
}
