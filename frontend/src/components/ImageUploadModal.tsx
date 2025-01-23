import { useState } from 'react';
import { Modal, Upload, Button, message, Slider } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Cropper from 'react-easy-crop';
import styled, { keyframes } from 'styled-components';

interface ImageUploadModalProps {
  visible: boolean;
  onCancel: () => void;
  onUpload: (file: File) => void;
}

// Add this helper function to create a cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      }
    }, 'image/jpeg');
  });
}

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(24, 144, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0);
  }
`;

const ListeningButton = styled(Button)<{ $isListening: boolean }>`
  &.ant-btn {
    animation: ${props => props.$isListening ? pulse : 'none'} 1.5s infinite;
    background-color: ${props => props.$isListening ? '#e6f7ff' : 'inherit'};
    border-color: ${props => props.$isListening ? '#1890ff' : 'inherit'};
    
    .anticon {
      color: ${props => props.$isListening ? '#1890ff' : 'inherit'};
    }
  }
`;

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ visible, onCancel, onUpload }) => {
  const [fileList, setFileList] = useState<any>([]);
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const beforeUpload = (file: File) => {
    setPendingFile(file);
    setEditingImage(URL.createObjectURL(file));
    setShowEditModal(true);
    return false; // Prevent automatic upload
  };

  const handleCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleEditComplete = async () => {
    if (pendingFile && editingImage && croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(editingImage, croppedAreaPixels);
        const croppedFile = new File([croppedBlob], pendingFile.name, {
          type: 'image/jpeg',
        });
        
        // Check if we're editing an existing image
        const existingIndex = fileList.findIndex(
          (item: { originFileObj: File }) => item.originFileObj === pendingFile
        );

        if (existingIndex >= 0) {
          // Replace existing image
          const newFileList = [...fileList];
          newFileList[existingIndex] = {
            uid: fileList[existingIndex].uid,
            originFileObj: croppedFile,
            url: URL.createObjectURL(croppedBlob)
          };
          setFileList(newFileList);
        } else {
          // Add new image
          setFileList([...fileList, {
            uid: Date.now(),
            originFileObj: croppedFile,
            url: URL.createObjectURL(croppedBlob)
          }]);
        }
        
        setPendingFile(null);
        setShowEditModal(false);
        setEditingImage(null);
      } catch (e) {
        console.error(e);
        message.error('Error cropping image');
      }
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        onCancel={onCancel}
        onOk={() => fileList[0] && onUpload(fileList[0].originFileObj)}
        title="Upload Image"
      >
        <Upload
          fileList={fileList}
          beforeUpload={beforeUpload}
          accept="image/*"
          listType="picture-card"
          multiple={false}
          onPreview={(file) => {
            if (file.originFileObj) {
              setEditingImage(URL.createObjectURL(file.originFileObj));
              setShowEditModal(true);
              setPendingFile(file.originFileObj);
            }
          }}
          onRemove={(file) => {
            setFileList(fileList.filter((item: { uid: string }) => item.uid !== file.uid));
            return true;
          }}
        >
          {fileList.length < 5 && (
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Upload</div>
            </div>
          )}
        </Upload>
      </Modal>

      <Modal
        visible={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setPendingFile(null);
          setEditingImage(null);
        }}
        onOk={handleEditComplete}
        title="Edit Image"
        width={800}
      >
        <div style={{ position: 'relative', height: 400 }}>
          {editingImage && (
            <Cropper
              image={editingImage}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              showGrid={true}
              restrictPosition={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>
        <div style={{ padding: '20px 0' }}>
          <p>Zoom</p>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(value: number) => setZoom(value)}
          />
        </div>
      </Modal>
    </>
  );
};

export default ImageUploadModal;
