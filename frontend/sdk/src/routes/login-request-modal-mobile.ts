import { 
  LoginRequestModalMobile2,
} from '../components/pages';

const routes = [
    { 
      path: '/:id/p=:payload', 
      component: LoginRequestModalMobile2,
      meta: { bodyClass: ['bg-transparent', 'overflow-hidden'] },
      props: true,
    },
  ]
;

export {
    routes
}