import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { claimCredits, generateRandomId, getRandomLongInteger, invokeSub, isDatePastAMonth, loadCredits, regPush, regPushFCM } from '../hooks/libs';

function Splash() {
    const history = useHistory();
    useEffect(() => {
        loadWork();
    }, []);

    async function loadWork() {
    
        localStorage.setItem('subscribed', '');

        await regPushFCM();

        //claim rewards
        //await claimCredits();

        if (localStorage.getItem('invite_code') == null) {
            localStorage.setItem('invite_code', getRandomLongInteger(100000, 10000000).toString());
        }

        //loadCredits();

        //await invokeSub(() => {    });

        setTimeout(() => {
            if (localStorage.getItem("session") != null && localStorage.getItem('profileSet') != null) {
                history.replace('/gpt/chat');
            } else if (localStorage.getItem('profileSet') == null) {
                history.replace('/gpt/profile');
            } else {
                history.replace('/gpt/profile');
            }
        }, 1500);

    }
    return (
        <div style={{ height: "100vh", width: '100%', background: '#355db4' }}>
            <img src="./icon.png" style={{
                width: "100px",
                position: "relative",
                top: "calc((100vh/2) - (100px/2))",
                left: "calc((100% /2) - (100px/2))"
            }}></img>
        </div>
    );
};

export default Splash;
