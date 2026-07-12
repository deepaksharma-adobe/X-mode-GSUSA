import { DocumentNode } from 'graphql/language';

type GQLResult = [DocumentNode, {
    success: string[][];
    errors: string[][];
}];
export declare function mergeGQLElements(declarationAST: DocumentNode, operationAST: DocumentNode): GQLResult;
export declare function removeFragment(ast: DocumentNode, fragmentName: string): DocumentNode;
export {};
//# sourceMappingURL=extend-elements.d.ts.map