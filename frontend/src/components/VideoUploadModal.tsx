import { useState, useRef } from 'react';
import { Modal, Tabs, Upload, Button, message } from 'antd';
import { VideoCameraOutlined, UploadOutlined } from '@ant-design/icons';
import { Capacitor } from '@capacitor/core';
import { MediaCapture, CaptureVideoOptions } from '@awesome-cordova-plugins/media-capture';
const { TabPane } = Tabs;

const VideoUploadModal = ({ visible, onCancel, onUpload }: any) => {
    const [tabKey, setTabKey] = useState('1');
    const [fileList, setFileList] = useState<any>([]);
    const [,setVideoDuration] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleTabChange = (key: any) => {
        setTabKey(key);
    };

    const handleFileListChange = ({ fileList }: any) => {
        setFileList(fileList);
    };


    const renderTab1 = () => {
        return (
            <Upload
                fileList={fileList}
                beforeUpload={() => false}
                onChange={handleFileListChange}
                accept="video/*"
            >
                <Button icon={<UploadOutlined />}>Select Video</Button>
            </Upload>
        );
    };

    const renderTab2 = () => {
        return (
            <>
                <Button icon={<VideoCameraOutlined />} onClick={() => takeVideo()}>
                    Record Video
                </Button>
                <video ref={videoRef} style={{ display: 'none' }}></video>
            </>
        );
    };

    const takeVideo = async () => {
        try {
            const options: CaptureVideoOptions = {
                quality: 100,
                duration: 30,
                limit: 1
            };
            const video: any = await MediaCapture.captureVideo(options);
            const videoUrl = Capacitor.convertFileSrc(video.path);
            setVideoDuration(video.duration);
            if (videoRef.current) {
                videoRef.current.style.display = 'block';
                videoRef.current.src = videoUrl;
            }

            setFileList([{...video, path: videoUrl }]);
        } catch (e) {
            console.log(e);
            message.error("Video capture is only availble for mobile devices. Please try video upload instead.");
        }
    };



    return (
        <Modal visible={visible} onCancel={onCancel} onOk={(e) => onUpload(fileList)} >
            <Tabs activeKey={tabKey} onChange={handleTabChange}>
                <TabPane tab="Select Video" key="1">
                    {renderTab1()}
                </    TabPane>
                <TabPane tab="Record Video" key="2">
                    {renderTab2()}
                </TabPane>
            </Tabs>
        </Modal>
    );
};

export default VideoUploadModal;