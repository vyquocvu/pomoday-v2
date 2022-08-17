import { commonStore } from '../anyState';

const handelFocus = id => {
  return commonStore.setItem('focusingTask', id ? String(id) : '');
};

export default handelFocus;
