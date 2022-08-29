import { createStore } from 'anystate';

export const commonStore = createStore({
  focusingTask: 0,
  isHoldingAlt: false,
});
