import ace from 'brace';
import 'brace/theme/clouds';
import 'brace/mode/json';
import 'brace/ext/searchbox';

import './index.css';

const aceEditorModule = {
    _editors: new WeakMap(),

    // https://github.com/ajaxorg/ace/blob/master/lib/ace/commands/default_commands.js
    // Remove commands that shadow native browser keybindings or require
    // loading additional code from ext/
    commandsBlacklist: [
        'showSettingsMenu',
        'goToNextError',
        'goToPreviousError',
        'gotoline',
        'jumptomatching',
        'transposeletters',
    ],


    _updateValue(editor, vnode) {
        const text = vnode.children[0].text;
        if (editor.getValue() === text) return;
        vnode.elm.value = text;
        const selection = editor.session.selection.toJSON();
        editor.setValue(text != null ? text : '', -1);
        editor.session.selection.fromJSON(selection);
    },

};

export default function (aceEditor) {
    return {
        insert(vnode) {
            const elm = vnode.elm;
            if (elm.hasAceEditor) return;

            const {setStyle, mode, options = {}} = aceEditor;

            const aceEl = document.createElement('div');
            const editor = ace.edit(aceEl);
            editor.$blockScrolling = Infinity; // Disable warning
            editor.setTheme('ace/theme/clouds');
            editor.setShowPrintMargin(false);
            editor.setStyle(setStyle);
            editor.setOptions({
                minLines: 3,
                maxLines: Infinity,
                ...options,
            });

            aceEditorModule.commandsBlacklist
                .forEach(c => editor.commands.removeCommand(c));

            const session = editor.getSession();
            session.setMode('ace/mode/' + mode);
            session.setUseWrapMode(true);
            session.on(
                'change',
                () => {
                    // Change was initiated by user, not API call
                    if (editor.curOp && editor.curOp.command.name) {
                        elm.value = editor.getValue();
                        // For snabbdom native event listeners, no IE <=11 support
                        elm.dispatchEvent(new Event('change', {bubbles: true}));
                    }
                }
            );

            aceEditorModule._editors.set(elm, editor);

            // Defer initial update for better perceived performance when text is
            // long
            setTimeout(() => aceEditorModule._updateValue(editor, vnode), 1);

            elm.hasAceEditor = true;
            elm.hidden = true;
            elm.after(aceEl);
        },

        update: (oldVnode, vnode) => {
            const editor = aceEditorModule._editors.get(vnode.elm);
            editor && aceEditorModule._updateValue(editor, vnode);
        },

        destroy: (vnode) => {

            const hook = vnode.data.hook || {};
            delete hook.insert;
            const editor = aceEditorModule._editors.get(vnode.elm);
            editor.destroy();
            editor.container.remove();
        },
    };
}
