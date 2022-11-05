import TreeNode from "./TreeNode";

export default interface TreeList extends TreeNode {
  clear(): void;
  length(): number;
  childAt(index: number): TreeNode;
  appendChild(child: TreeNode): void;
  indexOf(child: TreeNode): number;
  insertBefore(child: TreeNode, ref: TreeNode): boolean;
  insertAfter(child: TreeNode, ref: TreeNode): boolean;
  removeChild(child: TreeNode): boolean;
}
