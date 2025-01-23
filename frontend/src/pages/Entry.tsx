import { Button, Card, Col, Divider, Grid, Row, Space } from "antd";
import Typewriter from 'typewriter-effect';
import "./Entry.css";
import { useHistory } from "react-router";
import LogoHeader from "../components/LogoHeader";
import Meta from "antd/es/card/Meta";
const Entry = () => {
    const history = useHistory();
    // You can add more prompts and titles as needed to cover additional topics.

    const startQuickLink = (e: any) => {
        history.push('/gpt/chat', e);
    };


    return (
        <div className="entry-box">

            <LogoHeader />
            <Row gutter={[0, 48]}>
                <Col >
                    <Card
                        onClick={e => history.push('/gpt/chat')}
                        hoverable
                        bordered={false}
                        cover={<img alt="chat with ai" src="/ai_icons/chat.png" />}
                    >
                        <Meta title="Chat" description={<Typewriter
                            options={{
                                strings: ['Generate contents, ask questions, solve problems with a conversational AI model'],
                                autoStart: true,
                                loop: true,
                                delay: 100
                            }}
                        />} />

                    </Card>
                </Col>
                <Col  >
                    <Card
                        onClick={e => history.push('/gpt/art')}
                        hoverable
                        bordered={false}
                        cover={<img alt="generate art" src="/ai_icons/art.png" />}
                    >
                        <Meta title="Designer" description="Draw your thoughts using AI" />
                    </Card></Col>

                <Col  >
                    <Card
                        onClick={e => history.push('/gpt/video')}
                        hoverable
                        bordered={false}
                        cover={<img alt="generate video" src="/ai_icons/video.png" />}
                    >
                        <Meta title="Video" description="Bring your visual ideas to life" />
                    </Card></Col>

                <Col >
                    <Card
                        onClick={e => history.push('/gpt/trivia')}
                        hoverable
                        bordered={false}
                        cover={<img alt="trivia" src="/ai_icons/game.png" />}
                    >
                        <Meta title="Play trivia" description="Have some fun with trivia game geenrated by AI" />
                    </Card></Col>
                <Col  >
                    <Card
                        onClick={e => history.push('/gpt/feeds')}
                        hoverable
                        bordered={false}
                        cover={<img alt="explore community" src="/ai_icons/social.png" />}
                    >
                        <Meta title="Community" description="Explore what others are doing with AI" />
                    </Card></Col>
            </Row>
            { /* <Divider>Suggestions</Divider>
          */ }
        </div>
    )
}

export default Entry;