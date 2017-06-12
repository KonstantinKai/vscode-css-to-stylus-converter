'use strict';

import {
    commands,
    ExtensionContext,
    window,
    workspace,
    TextEditor,
    TextEditorEdit,
    Position,
    Uri,
    Range,
    TextDocument,
    InputBoxOptions
} from 'vscode';

import {existsSync} from 'fs';
import {basename, extname, resolve as pathResolve} from 'path';
import * as css2stylus from 'css-to-stylus-converter';

function getCompiled (css: string): string {
    let compiled: string;

    try {
        compiled = css2stylus(css, workspace.getConfiguration('cssToStylus'));
    } catch (e) {
        compiled = [].concat(e.stack).join('\n');
    } finally {
        return compiled;
    }
}

const UPDATE_TIMEOUT = 800;

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('extension.cssToStylus', () => {
        let editor: TextEditor = window.activeTextEditor;

        if (editor) {
            if (editor.document.languageId !== 'css') {
                return  window.showWarningMessage('Only css syntax is supported.');
            }
        } else {
            return window.showWarningMessage('No active editors.');
        }

        let targetFilename = editor.document.fileName.replace(/\.css$/, '.styl');

        if (existsSync(targetFilename)) {
            return window.showInputBox({
                prompt: `File "${basename(targetFilename)}" arleady exists, please choose another name:`
            }).then(value => {
                if (typeof value !== 'undefined' && value.length) {
                    if (extname(value) !== '.styl') {
                        value = `${value.replace(/\.$/, '')}.styl`;
                    }

                    return showCompiledDocument(pathResolve(workspace.rootPath, value));
                }
            });
        }

        return showCompiledDocument(targetFilename);
    });

    context.subscriptions.push(disposable);
}

function showCompiledDocument (filename: string): void {
    let editor = window.activeTextEditor;
    let uri: Uri = Uri.parse(`untitled:${filename}`);

    workspace.openTextDocument(uri).then((document: TextDocument) => {
        window.showTextDocument(document, 2, true).then((textEditor: TextEditor) => {
            let timeout;

            workspace.onDidChangeTextDocument(e => {
                if (e.document === editor.document) {
                    clearTimeout(timeout);

                    if (!textEditor.document) return false;

                    timeout = setTimeout(() => {
                        textEditor.edit((textEditorEdit: TextEditorEdit) => {
                            textEditorEdit.replace(
                                new Range(
                                    new Position(0, 0),
                                    new Position(textEditor.document.lineCount, 0)),
                                    getCompiled(editor.document.getText()
                                )
                            );
                        });
                    }, UPDATE_TIMEOUT);
                }
            });

            textEditor.edit((textEditorEdit: TextEditorEdit) => {
                textEditorEdit.insert(new Position(0, 0), getCompiled(editor.document.getText()));
            });
        });
    });
}

export function deactivate() {}