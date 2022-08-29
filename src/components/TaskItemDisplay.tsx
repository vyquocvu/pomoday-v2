import * as React from 'react';
import { TimeSpent } from './TimeSpent';
import { getStatus, taskAsString, TaskStatus } from '../helpers/utils';
import handleFocus from '../helpers/useFocus';
import { commonStore } from '../anyState';

export const TaskItemDisplay = props => {
  const task = props.task;
  const matching = props.matching || undefined;
  const [isFocused, setFocus] = React.useState(false);
  commonStore.watch('focusingTask', focusingTask => {
    if (focusingTask && isFocused !== (Number(focusingTask) === task.id)) {
      setFocus(Number(focusingTask) === task.id);
    }
  });

  return (
    <div className={'flex flex-row'}>
      {isFocused && '→'}
      <div className="el-task-id pt-1 self-start w-8 text-right text-stall-light mr-3 pr-2 border-control2nd border-r-2">
        {task.id}
      </div>
      <div className="el-task-content pt-1 self-center flex-1 text-left">
        <span className={`task-content inline-block relative pl-5`}>
          <a
            className={
              task.status === TaskStatus.DONE
                ? 'el-task-done inline-block text-stall-light line-through  outline-none'
                : 'el-task-normal inline-block outline-none'
            }
            dangerouslySetInnerHTML={{
              __html:
                getStatus(task.status, true) +
                taskAsString(task.title, matching),
            }}
            href=""
            id={`task-${task.id}`}
            onFocus={() => handleFocus(task.id)}
            onBlur={e => handleFocus(null)}
            onClick={e => e.preventDefault()}
          />
        </span>{' '}
        <TimeSpent task={task} />
      </div>
    </div>
  );
};
