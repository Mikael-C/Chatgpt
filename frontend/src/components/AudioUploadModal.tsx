import React, { useState, useRef, useEffect } from 'react';
import { Modal, Tabs, Upload, Button, message, Spin } from 'antd';
import { AudioOutlined, UploadOutlined } from '@ant-design/icons';
import { Capacitor } from '@capacitor/core';
import { MediaCapture, CaptureAudioOptions, MediaFile, CaptureError } from '@awesome-cordova-plugins/media-capture';
const { TabPane } = Tabs;

const AudioUploadModal = ({ visible, onCancel, onUpload }: any) => {
    const [tabKey, setTabKey] = useState('1');
    const [fileList, setFileList] = useState<any>([]);
    const [, setAudioDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [mediaRecorder, setMediaRecorder] = useState<any>();
    const [audioChunks, setAudioChunks] = useState<any>([]);
    const [isRecording, setIsRecording] = useState(false);
    const handleTabChange = (key: any) => {
        setTabKey(key);
    };

    const handleFileListChange = ({ fileList }: any) => {
        setFileList(fileList);
    };

    useEffect(() => {
        initWebRecorder();
    }, []);
    const renderTab1 = () => {
        return (
            <Upload
                fileList={fileList}
                beforeUpload={() => false}
                onChange={handleFileListChange}
                accept="audio/*"
            >
                <Button icon={<UploadOutlined />}>Select Audio</Button>
            </Upload>
        );
    };

    const renderTab2 = () => {
        return (
            <>
                <Button icon={isRecording ? <Spin /> : <AudioOutlined />} onClick={() => isRecording ? stopRecording() : takeAudio()}>
                    {isRecording ? "Stop Recording" : "Record Audio"}
                </Button><div>
                    <audio ref={audioRef} controls style={{ display: 'none' }}></audio></div>
            </>
        );
    };


    const takeAudio = async () => {
        if (Capacitor.isNativePlatform()) {
            const options: CaptureAudioOptions = {
                duration: 30,
                limit: 1
            };
            MediaCapture.captureAudio(options).then(async (media: any) => {
                //const media: any = await MediaCapture.captureAudio(options);

                if (media.length > 0) {
                    const audioUrl = Capacitor.convertFileSrc(media[0].fullPath);
                    setAudioDuration(media[0].duration);
                    if (audioRef.current) {
                        audioRef.current.src = audioUrl;
                        audioRef.current.style.display = 'block';
                    }
                    const blobData = await getBlobData(audioUrl);
                    //alert(audioUrl);
                    //alert(JSON.stringify(media));
                    //alert(JSON.stringify(blobData));
                    setFileList([{ media: media[0], path: audioUrl, blobData: blobData, type: 'mp3' }]);
                } else {
                    message.error("No audio captured");
                }
            }).catch((err: any) => {
                message.error(`Unable to get native media ${err}`);
                //startRecording();
            });
        } else {
            startRecording();
        }
    };

    async function getBlobData(urlPath: any) {
        const blobData: any = await fetch(urlPath).then((res) => res.blob());
        return blobData;
    }
    function initWebRecorder() {

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const recorder = new MediaRecorder(stream);
                setMediaRecorder(recorder);
            });
    }
    const handleDataAvailable = (event: any) => {
        console.log("data was found");
        const prevChunks = audioChunks;
        prevChunks.push(event?.data);
        setAudioChunks(prevChunks);
    }
    const handleDataStopped = async () => {
        console.log("audio stopped");
        setAudioChunks([]);
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.style.display = "block";
            playAudio();
            setFileList([{ path: audioUrl, blobData: await getBlobData(audioUrl), type: 'mp3' }]);
        }
    }
    function initEvents(recorder: any) {
        recorder.addEventListener("dataavailable", handleDataAvailable);
        recorder.addEventListener("stop", handleDataStopped);
    }
    function startRecording() {
        if (mediaRecorder) {
            initEvents(mediaRecorder);
            setAudioChunks([]);
            mediaRecorder.start();
            setIsRecording(true);
            if (audioRef.current) {
                audioRef.current.style.display = 'none';
            }
        } else {
            message.info("setting up microphone....");
            initWebRecorder();
        }
    }

    function stopRecording() {
        if (mediaRecorder?.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
            setAudioChunks([]);
        }
    }


    const playAudio = async () => {
        if (audioRef.current) {
            await audioRef.current.play();
        }
    };

    const cleanupRecorder = () => {
        if (mediaRecorder) {
            mediaRecorder.removeEventListener("dataavailable", handleDataAvailable);
            mediaRecorder.removeEventListener("stop", handleDataStopped);
            mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
            setMediaRecorder(null);
        }
    };
    const stopRecordingAndCloseModal = () => {
        if (isRecording) {
            stopRecording();
        }
        cleanupRecorder();
    };
    return (
        <Modal visible={visible} onCancel={() => {
            stopRecordingAndCloseModal();
            setFileList([]);
            onCancel();
            if (audioRef.current) {
                audioRef.current.src = '';
                audioRef.current.style.display = 'none';
            }
        }}
            onOk={() => {
                stopRecordingAndCloseModal();
                onUpload(fileList)

            }} afterClose={() => setFileList([])} >
            <Tabs activeKey={tabKey} onChange={handleTabChange}>
                <TabPane tab="Select Audio" key="1">
                    {renderTab1()}
                </TabPane>
                <TabPane tab="Record Audio" key="2">
                    {renderTab2()}
                </TabPane>
            </Tabs>
        </Modal>
    );
};

export default AudioUploadModal;
