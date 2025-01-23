import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import Home from './pages/Home';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';
import Chat from './pages/Chat';
import IdentifyImageObject from './pages/IdentifyImageObject';
import Ocr from './pages/Ocr';
import Translator from './pages/Translator';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Subscribe from './pages/Subscribe';
import Splash from './pages/Splash';
import { Art } from './pages/Art';
import { Landmark } from './pages/Landmark';
import { Trade } from './pages/Trade';
import Trivia from './pages/Trivia';
import Entry from './pages/Entry';
import { Video } from './pages/Video';


setupIonicReact();

const App: React.FC = () => {

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/gpt/opensesame">
            <Home />
          </Route>
          <Route exact path="/gpt/entry">
            <Entry />
          </Route>
          <Route exact path="/gpt/chat">
            <Chat />
          </Route>
          <Route exact path="/gpt/art">
            <Art />
          </Route> 
          <Route exact path="/gpt/video">
            <Video />
          </Route>
          <Route exact path="/gpt/more/identifyobject">
            <IdentifyImageObject />
          </Route>
          <Route exact path="/gpt/ocr" >
            <Ocr />
          </Route>
          <Route exact path="/gpt/more/translator" >
            <Translator />
          </Route>
          <Route exact path="/gpt/more/landmark" >
            <Landmark />
          </Route>
          <Route exact path="/gpt/feeds" >
            <Feed />
          </Route>
          <Route exact path="/gpt/profile" >
            <Profile />
          </Route>
          <Route exact path="/gpt/subscribe" >
            <Subscribe />
          </Route>
          <Route exact path="/gpt/splash">
            <Splash />
          </Route>
          <Route exact path="/gpt/trade">
            <Trade />
          </Route>
          <Route exact path="/gpt/trivia">
            <Trivia />
          </Route>
          <Redirect from="/" to="/gpt/splash" exact />
          <Redirect from="/chat" to="/gpt/chat" exact />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  )
};

export default App;
