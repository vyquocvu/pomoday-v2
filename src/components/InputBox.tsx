import * as React from 'react';
import { StateContext } from './App';
import {
  findCommon,
  getHistoryQueue,
  KEY_DOWN,
  KEY_ESC,
  KEY_F,
  KEY_INPUT,
  KEY_N,
  KEY_P,
  KEY_RETURN,
  KEY_RIGHT,
  KEY_SLASH,
  KEY_TAB,
  KEY_UP,
  MAX_COMMAND_QUEUE_LENGTH,
  KEY_SHIFT,
} from '../helpers/utils';
import Queue from '../helpers/queue';
import { parseCommand } from '../helpers/commands/parser';
import {
  archiveCommand,
  beginCommand,
  checkCommand,
  deleteCommand,
  editTaskCommand,
  flagCommand,
  hideCommand,
  insertTaskCommand,
  moveCommand,
  otherCommand,
  restoreCommand,
  searchCommand,
  showCommand,
  stopCommand,
  switchCommand,
  tagRenameCommand,
} from '../helpers/commands/actions';
import { useEventListener } from '../helpers/hooks';
import { commonStore } from '../anyState';

export const InputBox = props => {
  const inputRef = React.useRef(null);
  const suggestRef = React.useRef(null);
  const [state, setState] = React.useContext(StateContext);
  const [isVisible, setVisible] = React.useState(false);
  const [isFullEditor, setFullEditor] = React.useState(false);
  const [latestKey, setLatestKey] = React.useState('');
  let historyIndex = -1;
  const history: Queue<string> = getHistoryQueue(state.history);
  let suggestion = '';

  const processInput = e => {
    if (suggestRef && suggestRef.current) {
      const value = inputRef.current.value;
      if (value) {
        const matched = history.match(i => i.indexOf(value) === 0);
        suggestion = findCommon(matched);
        // Special case: If it's edit command, fetch the task content
        const isEditCommand = value.match(/^e(?:dit)?\ (\d+)\s?$/i);
        if (isEditCommand && isEditCommand[1]) {
          const id = parseInt(isEditCommand[1]);
          if (id && !isNaN(id)) {
            const found = (state.tasks.filter(t => t.id === id) || []).pop();
            if (found) {
              suggestion = `${value.trim()} ${found.title}`;
            }
          }
        }
        // --------------------------------------------
        if (suggestion) {
          suggestRef.current.value = suggestion;
        } else {
          suggestRef.current.value = '';
        }
      } else {
        suggestRef.current.value = '';
      }
    }
  };

  const onKeyDown = e => {
    if (inputRef && inputRef.current) {
      if (!state.sawTheInput) {
        setState({
          ...state,
          sawTheInput: true,
        });
      }
      const key = e.which || e.keyCode;
      const meta = e.ctrlKey || e.metaKey;
      // TAB or Ctrl + F to pickup the suggestion
      if (key === KEY_TAB || (!isFullEditor && meta && key == KEY_F)) {
        if (suggestion) {
          inputRef.current.value = suggestion;
          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }
      // UP KEY
      else if (
        (!isFullEditor && key === KEY_UP) ||
        (!isFullEditor && meta && key === KEY_P)
      ) {
        if (historyIndex < MAX_COMMAND_QUEUE_LENGTH - 1) {
          historyIndex++;
          const historyValue = history.peek(historyIndex);
          if (historyValue) {
            inputRef.current.value = historyValue;
          }
        }
      }
      // DOWN KEY
      else if (
        (!isFullEditor && key === KEY_DOWN) ||
        (!isFullEditor && meta && key === KEY_N)
      ) {
        if (historyIndex > 0) {
          historyIndex--;
          const historyValue = history.peek(historyIndex);
          if (historyValue) {
            inputRef.current.value = historyValue;
          }
        }
      }
      // ENTER KEY or Meta + ENTER if it's a full editor
      else if (isFullEditor ? meta && key === KEY_RETURN : key === KEY_RETURN) {
        const cmd = parseCommand(inputRef.current.value);
        let tasksToUpdate = null;
        let updateCandidate = {
          ...state,
        };
        if (cmd) {
          const ids = cmd.id
            ? (cmd.id.match(/\d+/g) || []).map(s => parseInt(s))
            : null;
          switch (cmd.command.toLowerCase()) {
            case 'mv':
            case 'move':
              tasksToUpdate = moveCommand(tasksToUpdate, state, ids, cmd);
              break;
            case 'b':
            case 'begin':
              tasksToUpdate = beginCommand(tasksToUpdate, state, ids);
              break;
            case 'c':
            case 'check':
              tasksToUpdate = checkCommand(tasksToUpdate, state, ids);
              break;
            case 'd':
            case 'delete':
              tasksToUpdate = deleteCommand(tasksToUpdate, ids, cmd, state);
              break;
            case 'fl':
            case 'flag':
              tasksToUpdate = flagCommand(tasksToUpdate, state, ids);
              break;
            case 'st':
            case 'stop':
              tasksToUpdate = stopCommand(tasksToUpdate, state, ids);
              break;
            case 'sw':
            case 'switch':
              tasksToUpdate = switchCommand(tasksToUpdate, state, ids);
              break;
            case 'a':
            case 'archive':
              tasksToUpdate = archiveCommand(ids, cmd, tasksToUpdate, state);
              break;
            case 're':
            case 'restore':
              tasksToUpdate = restoreCommand(ids, cmd, tasksToUpdate, state);
              break;
            case 't':
            case 'task':
              tasksToUpdate = insertTaskCommand(cmd, state, tasksToUpdate);
              break;
            case 'e':
            case 'edit':
              tasksToUpdate = editTaskCommand(ids, cmd, tasksToUpdate, state);
              break;
            case 'tr':
            case 'tagre':
            case 'tagrename':
              tasksToUpdate = tagRenameCommand(cmd, tasksToUpdate, state);
              break;
            /* Visibility */
            case 'hide':
              updateCandidate = hideCommand(updateCandidate, cmd);
              break;
            case 'show':
              updateCandidate = showCommand(updateCandidate, cmd);
              break;
            /* Single command */
            case 'search':
              updateCandidate = searchCommand(updateCandidate, cmd);
              break;
            default:
              updateCandidate = otherCommand(updateCandidate, cmd, state);
              break;
          }
        }
        if (tasksToUpdate) {
          updateCandidate = {
            ...updateCandidate,
            tasks: tasksToUpdate,
          };
        }
        setState({
          ...updateCandidate,
          history: history.push(inputRef.current.value),
        });
        inputRef.current.value = '';
        setVisible(false);
        event.preventDefault();
        return;
      }
    }
  };

  const openInput = (
    fullEditor: boolean,
    search: boolean,
    initial: string = '',
  ) => {
    setFullEditor(fullEditor);
    setVisible(true);
    if (search) {
      inputRef.current.value = '/';
    } else {
      inputRef.current.value = initial;
    }
    inputRef.current.focus();
  };

  const hideInput = () => {
    setVisible(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const focusInput = event => {
    setLatestKey(event.key);
    if (
      state.showHelp ||
      state.showQuickHelp ||
      (state.userWantToLogin && !state.authToken)
    ) {
      event.preventDefault();
      return;
    }
    const inputIsFocused =
      inputRef && inputRef.current === document.activeElement;
    const activeIsEditor =
      document.activeElement.tagName.match(/input|textarea/i) !== null;
    // Some global typeahead keys could be defined here
    if (!inputIsFocused && !activeIsEditor) {
      if (event.keyCode === KEY_SLASH) {
        openInput(event.shiftKey, event.keyCode === KEY_SLASH);
      } else if (event.keyCode >= 48 && event.keyCode <= 90) {
        // Typeahead should only be allowed for [0-9a-Z]
        let c = String.fromCharCode(event.keyCode).toLowerCase();
        if (event.shiftKey) c = c.toUpperCase();
        // For special commands, insert the space afterward
        const specialCommands = 'bcdea';
        const taskId = commonStore.getItem('focusingTask');
        if (specialCommands.indexOf(c) !== -1) {
          c += ' ' + taskId;
        } else {
          c = '';
        }
        openInput(event.shiftKey, false, c);
      }
    }
    if (event.keyCode === KEY_ESC) {
      hideInput();
    }
  };

  useEventListener('keyup', focusInput);

  return (
    <>
      <div className={'fixed bottom-0 left-0 m-5'}>
        <span
          className={`hidden min-w-10 h-9 ${
            latestKey ? 'sm:block' : ''
          } bg-white px-3 py-2 rounded-lg shadow-lg mr-2 `}>
          {latestKey}
        </span>
      </div>
      {isVisible || state.settings.stickyInput ? (
        <div
          className={`${
            !state.settings.stickyInput
              ? 'absolute top-0 right-0 bottom-0 left-0'
              : ''
          } flex items-center justify-center`}>
          <div
            className={`el-editor bg-control2nd border-stall-light border
        ${
          !state.settings.stickyInput
            ? 'w-9/12 sm:w-7/12 md:w-5-12 rounded-lg shadow-lg'
            : 'w-full'
        }
        ${
          isFullEditor
            ? state.settings.stickyInput
              ? 'h-64'
              : 'h-64 mb-32'
            : state.settings.stickyInput
            ? 'h-12'
            : 'h-12 mb-64'
        }
        relative overflow-hidden`}>
            <textarea
              ref={inputRef}
              className={`bg-transparent text-foreground w-full h-full p-3 px-4 absolute top-0 left-0 z-10 resize-none ${
                state.settings.stickyInput
                  ? 'border-l-4 border-transparent focus:border-green'
                  : ''
              }`}
              tabIndex={0}
              autoFocus={true}
              onKeyPress={processInput}
              onKeyUp={processInput}
              onKeyDown={onKeyDown}
              placeholder="Type anything here..."
            />
            <textarea
              ref={suggestRef}
              className={`bg-transparent text-foreground w-full h-full p-3 px-4 absolute top-0 left-0 z-0 pointer-events-none resize-none opacity-25 ${
                state.settings.stickyInput
                  ? 'border-l-4 border-transparent focus:border-green'
                  : ''
              }`}
              disabled={true}
              value={''}
            />
          </div>
          <div
            className={
              'block sm:hidden fixed bottom-0 right-0 sm:right-auto sm:left-0 m-5'
            }>
            <button
              onClick={hideInput}
              className={
                'sm:hidden text-3xl bg-tomato text-white rounded-full shadow-lg w-16 h-16'
              }>
              ✕
            </button>
          </div>
          <div className={'fixed bottom-0 right-0 m-5'}>
            {isFullEditor ? (
              <span
                className={
                  'hidden sm:block bg-white px-3 py-2 rounded-lg shadow-lg'
                }>
                Press <code>Enter</code> for new line. <code>Ctrl + Enter</code>{' '}
                for submit.
              </span>
            ) : state.settings.hintPopup ? (
              <span
                className={`hidden sm:block bg-white px-3 py-2 rounded-lg shadow-lg ${
                  state.settings.stickyInput ? 'mb-10' : ''
                }`}>
                <p>
                  <b>
                    <u>/</u>:
                  </b>{' '}
                  search for anything
                </p>
                <p>
                  <b>
                    <u>t</u>ask:
                  </b>{' '}
                  create a new task
                </p>
                <p>
                  <b>
                    <u>b</u>egin:
                  </b>{' '}
                  start timer
                </p>
                <p>
                  <b>
                    <u>st</u>op:
                  </b>{' '}
                  stop timer
                </p>
                <p>
                  <b>
                    <u>fl</u>ag:
                  </b>{' '}
                  flag a task
                </p>
                <p>
                  <b>
                    <u>e</u>dit:
                  </b>{' '}
                  edit a task
                </p>
                <p>
                  <b>
                    <u>move</u>:
                  </b>{' '}
                  move task to another tag
                </p>
                <p>
                  <b>
                    <u>d</u>elete:
                  </b>{' '}
                  delete task
                </p>
                <p>
                  <b>
                    <u>a</u>rchive:
                  </b>{' '}
                  archive a task
                </p>
                <p>
                  <b>
                    <u>re</u>store:
                  </b>{' '}
                  unarchive a task
                </p>
                <p>
                  <b>
                    <u>sw</u>itch:
                  </b>{' '}
                  switch the working task
                </p>
                <p>
                  <b>
                    <u>list-archived</u>:
                  </b>{' '}
                  show archived tasks
                </p>
                <p>
                  <b>
                    <u>today</u>:
                  </b>{' '}
                  show today overview
                </p>
                <p>
                  <b>
                    <u>customize</u>:
                  </b>{' '}
                  show CSS editor
                </p>
                <p>
                  <b>
                    <u>help</u>:
                  </b>{' '}
                  show help page
                </p>
              </span>
            ) : null}
          </div>
        </div>
      ) : state.showQuickHelp || state.showHelp ? null : (
        <div className={'fixed bottom-0 right-0 m-5'}>
          <span
            className={
              'hidden sm:block bg-white px-3 py-2 rounded-lg shadow-lg'
            }>
            Type anything, or press <code>/</code> to search. <br />
            Tab to select Task <br />→ <code>Alt + Arrow Up/Down</code> to move
            task
          </span>
          <button
            onClick={openInput.bind(this.false, this.false)}
            className={
              'sm:hidden text-5xl bg-green text-white rounded-full shadow-lg w-16 h-16'
            }>
            ⌨
          </button>
        </div>
      )}
    </>
  );
};
