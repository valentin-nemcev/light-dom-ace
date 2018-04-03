import ace from 'brace';
import 'brace/theme/chrome';
import 'brace/mode/json';
import 'brace/mode/sql';
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
        afterAttach(elm) {
            if (elm.hasAceEditor) return;

            const {setStyle, mode, options = {}} = aceEditor;

            const aceEl = document.createElement('div');
            const editor = ace.edit(aceEl);
            let editorPrevValue = '';
            editor.$blockScrolling = Infinity; // Disable warning
            editor.setTheme('ace/theme/chrome');
            editor.setShowPrintMargin(false);
            if (options.readOnly) {
                Object.assign(options, {
                    highlightActiveLine: false,
                    showGutter: false,
                });
                editor.renderer.$cursorLayer.element.style.display = 'none';
            }
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
                    if (editorPrevValue != editor.getValue()) {
                        elm.value = editor.getValue();
                        // For dom native event listeners, no IE <=11 support
                        elm.dispatchEvent(new Event('change', {bubbles: true}));
                        editorPrevValue = editor.getValue();
                    }
                }
            );

            aceEditorModule._editors.set(elm, editor);

            elm.hasAceEditor = true;
            elm.hidden = true;
            elm.after(aceEl);
        },

        afterUpdate(vnode) {
            const editor = aceEditorModule._editors.get(vnode.elm);
            editor && aceEditorModule._updateValue(editor, vnode);
        },

        beforeDetach(elm) {
            const editor = aceEditorModule._editors.get(elm);
            editor.destroy();
            editor.container.remove();
        },
    };
}
