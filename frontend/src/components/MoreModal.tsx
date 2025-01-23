import { Modal, Button, Grid, Row, Col, Typography, message } from 'antd';
import { SecurityScanFilled, AudioFilled, VideoCameraOutlined, TranslationOutlined, ArrowsAltOutlined, ScanOutlined, FormatPainterOutlined, AreaChartOutlined } from '@ant-design/icons';
import './MoreModal.css';
import { useHistory } from 'react-router';

const MoreModal = ({ visible, onCancel }: any) => {
    const history = useHistory();
    return (
        <Modal visible={visible} onCancel={onCancel} footer={null} >
            <>
                <Typography.Title level={3}>More tools from LonerAI</Typography.Title>
                <Row>

                    <Col span={12}>
                        <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/art') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'><FormatPainterOutlined style={{ fontSize: '50px' }} /> <br /><Typography.Text>Generate Image</Typography.Text></Button>
                    </Col>
                    <Col span={12}> 
                        <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/video') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'><VideoCameraOutlined style={{ fontSize: '50px' }} /> <br /><Typography.Text>Generate video</Typography.Text></Button>
                    </Col>
                </Row>
                <Row>
                    <Col span={12}>
                        <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/more/translator') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'><TranslationOutlined style={{ fontSize: '50px' }} /> <br /><Typography.Text>Translator</Typography.Text></Button>
                    </Col>
                    <Col span={12}>
                        <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/more/translator') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'><SecurityScanFilled style={{ fontSize: '50px' }} /> <br /><Typography.Text>Speech to text</Typography.Text></Button>
                    </Col>
                </Row><Row>
                    <Col span={12}>
                        <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/more/identifyobject') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'> <SecurityScanFilled style={{ fontSize: '50px' }} /> <br /><Typography.Text >Identify Object in a photo</Typography.Text></Button>
                    </Col>
                    <Col span={12}>
                        <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/ocr') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'><ScanOutlined style={{ fontSize: '50px' }} /> <br /><Typography.Text >OCR (Extract text from image)</Typography.Text></Button>
                    </Col>
                </Row>
                <Row> <Col span={12}>
                    <Button type='text' onClick={() => localStorage.getItem('subscribed') != null ? history.push('/gpt/more/landmark') : (() => { message.error('Only subscribed users can use this feature'); history.push('/gpt/subscribe') })()} size='large' className='btn-block'><AreaChartOutlined style={{ fontSize: '50px' }} /> <br /><Typography.Text>Identify Landmark</Typography.Text></Button>
                </Col></Row>
            </>
        </Modal>
    );
};

export default MoreModal;