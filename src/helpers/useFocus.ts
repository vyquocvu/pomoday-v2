import { commonStore } from '../anyState';

const handleFocus = id => {
  return commonStore.setItem('focusingTask', id ? id : 0);
};

export default handleFocus;
