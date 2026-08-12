import ReactDOM from 'react-dom';
import cloneDeep from 'lodash/cloneDeep';
import { serializeNodesToText } from '@plone/volto-slate/editor/render';
import { Editor } from 'slate';
import {
  getPreviousVoltoBlock,
  getNextVoltoBlock,
  mergeSlateWithBlockBackward,
  mergeSlateWithBlockForward,
} from '@plone/volto-slate/utils/volto-blocks';
import {
  isCursorAtBlockStart,
  isCursorAtBlockEnd,
} from '@plone/volto-slate/utils/selection';
import { makeEditor } from '@plone/volto-slate/utils/editor';
import {
  changeBlock,
  deleteBlock,
  getBlocksFieldname,
  getBlocksLayoutFieldname,
} from '@plone/volto/helpers/Blocks/Blocks';

/*
 * CUSTOMIZATION: `mergeSlateWithBlockBackward`/`mergeSlateWithBlockForward` are
 * run against a detached clone of `editor` instead of the live, mounted one.
 *
 * The block being merged away still has an active `<Slate onChange>`
 * subscription (see SlateEditor.jsx) that fires on every `Transforms`
 * operation applied to its editor and persists `editor.children` back onto
 * its OWN block via a stale `properties` snapshot. Mutating the live editor
 * to compute the merge races with that reactive save and, depending on
 * timing, ends up reverting/overwriting the deliberate cross-block update
 * done below (previous block unchanged, current block left in place with the
 * merged/concatenated text instead of being removed).
 *
 * Running the merge on a throwaway editor (same technique already used by
 * `getBlockEndAsRange` below) avoids touching the live editor entirely, so no
 * stray save can happen.
 */
function detachedEditorFrom(editor) {
  const detached = makeEditor();
  detached.children = cloneDeep(editor.children);
  detached.selection = editor.selection ? cloneDeep(editor.selection) : null;
  return detached;
}

export function joinWithPreviousBlock({ editor, event }, intl) {
  if (!isCursorAtBlockStart(editor)) return;

  const blockProps = editor.getBlockProps();
  const {
    block,
    index,
    saveSlateBlockSelection,
    onSelectBlock,
    data,
    properties,
    onChangeField,
  } = blockProps;

  const blocksFieldname = getBlocksFieldname(properties);
  const blocksLayoutFieldname = getBlocksLayoutFieldname(properties);

  const prev = getPreviousVoltoBlock(index, properties);
  if (!prev) return;
  const [otherBlock = {}, otherBlockId] = prev;

  // Don't join with required blocks
  if (data?.required || otherBlock?.required || otherBlock['@type'] !== 'slate')
    return;

  event.stopPropagation();
  event.preventDefault();

  // If the Editor contains no characters TODO: clarify if this special case
  // really needs to be handled or not. In `joinWithNextBlock` it is not
  // handled.
  const text = Editor.string(editor, []);
  if (!text) {
    const cursor = getBlockEndAsRange(otherBlock);
    const newFormData = deleteBlock(properties, block, intl);

    ReactDOM.unstable_batchedUpdates(() => {
      saveSlateBlockSelection(otherBlockId, cursor);

      onChangeField(blocksFieldname, newFormData[blocksFieldname]);
      onChangeField(blocksLayoutFieldname, newFormData[blocksLayoutFieldname]);

      onSelectBlock(otherBlockId);
    });

    return true;
  }

  // Else the editor contains characters, so we merge the current block's
  // `editor` with the block before, `otherBlock`. Use a detached clone (see
  // comment above) so the live, still-mounted editor is never mutated.
  const mergeEditor = detachedEditorFrom(editor);
  const cursor = mergeSlateWithBlockBackward(mergeEditor, otherBlock);

  const combined = JSON.parse(JSON.stringify(mergeEditor.children));

  // // TODO: don't remove undo history, etc Should probably save both undo
  // // histories, so that the blocks are split, the undos can be restored??

  // const cursor = getBlockEndAsRange(otherBlock);
  const formData = changeBlock(properties, otherBlockId, {
    '@type': 'slate', // TODO: use a constant specified in src/constants.js instead of 'slate'
    value: combined,
    plaintext: serializeNodesToText(combined || []),
  });
  const newFormData = deleteBlock(formData, block, intl);

  ReactDOM.unstable_batchedUpdates(() => {
    saveSlateBlockSelection(otherBlockId, cursor);
    onChangeField(blocksFieldname, newFormData[blocksFieldname]);
    onChangeField(blocksLayoutFieldname, newFormData[blocksLayoutFieldname]);
    onSelectBlock(otherBlockId);
  });

  return true;
}

/**
 * Joins the current block (which has the cursor) with the next block to make a
 * single block.
 * @param {Editor} editor
 * @param {KeyboardEvent} event
 */
export function joinWithNextBlock({ editor, event }, intl) {
  if (!isCursorAtBlockEnd(editor)) return;

  const blockProps = editor.getBlockProps();
  const {
    block,
    index,
    // saveSlateBlockSelection,
    onSelectBlock,
    data,
  } = blockProps;

  const { properties, onChangeField } = editor.getBlockProps();
  const [otherBlock = {}, otherBlockId] = getNextVoltoBlock(index, properties);

  // Don't join with required blocks
  if (data?.required || otherBlock?.required || otherBlock['@type'] !== 'slate')
    return;

  event.stopPropagation();
  event.preventDefault();

  // Same reasoning as in `joinWithPreviousBlock`: the current block (`block`)
  // is the one being deleted here, but it's also the live, mounted editor
  // that triggered this handler. Merge on a detached clone so its own
  // `<Slate onChange>` never fires a stray "save my content" for a block
  // that's about to be removed.
  const mergeEditor = detachedEditorFrom(editor);
  mergeSlateWithBlockForward(mergeEditor, otherBlock);

  const combined = JSON.parse(JSON.stringify(mergeEditor.children));

  // TODO: don't remove undo history, etc Should probably save both undo
  // histories, so that the blocks are split, the undos can be restored??

  const blocksFieldname = getBlocksFieldname(properties);
  const blocksLayoutFieldname = getBlocksLayoutFieldname(properties);

  const formData = changeBlock(properties, otherBlockId, {
    // TODO: use a constant specified in src/constants.js instead of 'slate'
    '@type': 'slate',
    value: combined,
    plaintext: serializeNodesToText(combined || []),
  });
  const newFormData = deleteBlock(formData, block, intl);

  ReactDOM.unstable_batchedUpdates(() => {
    // saveSlateBlockSelection(otherBlockId, cursor);
    onChangeField(blocksFieldname, newFormData[blocksFieldname]);
    onChangeField(blocksLayoutFieldname, newFormData[blocksLayoutFieldname]);
    onSelectBlock(otherBlockId);
  });
  return true;
}

/**
 * @param {object} block The Volto object representing the configuration and
 * contents of a Volto Block of type Slate Text.
 * @returns {Range} The collapsed Slate Range that represents the last position
 * the text cursor can take inside the given block.
 */
function getBlockEndAsRange(block) {
  const { value } = block;
  const location = [value.length - 1]; // adress of root node
  const editor = { children: value };
  const newEditor = makeEditor();
  newEditor.children = cloneDeep(editor.children);
  const path = Editor.last(newEditor, location)[1]; // last Node in the block
  // The last Text node (leaf node) entry inside the path computed just above.
  const [leaf, leafpath] = Editor.leaf(newEditor, path);
  // The offset of the Points in the collapsed Range computed below:
  const offset = (leaf.text || '').length;

  return {
    anchor: { path: leafpath, offset },
    focus: { path: leafpath, offset },
  };
}
