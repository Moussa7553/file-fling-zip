import { useState, useCallback } from 'react';
import { Upload, X, File, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FileItem {
  id: string;
  file: File;
  preview?: string;
}

const FileUpload = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const fileItems = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    setFiles(prev => [...prev, ...fileItems]);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    toast.success('All files cleared');
  };

  const createZip = async () => {
    if (files.length === 0) {
      toast.error('Please add some files first');
      return;
    }

    setIsCreatingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        zip.file(fileItem.file.name, fileItem.file);
        setZipProgress(((i + 1) / files.length) * 50);
      }

      setZipProgress(75);
      
      const content = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });

      setZipProgress(100);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      saveAs(content, `file-fling-${timestamp}.zip`);
      
      toast.success('ZIP file created and downloaded successfully!');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast.error('Failed to create ZIP file');
    } finally {
      setIsCreatingZip(false);
      setZipProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = files.reduce((sum, file) => sum + file.file.size, 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-6 w-6" />
            File Fling Zip
          </CardTitle>
          <CardDescription>
            Upload multiple files and create a ZIP archive. Perfect for cloud hosting on Hostinger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Support for all file types
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button variant="outline" asChild>
                <span>Choose Files</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Selected Files ({files.length})</CardTitle>
                <CardDescription>
                  Total size: {formatFileSize(totalSize)}
                </CardDescription>
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={clearAllFiles}>
                  Clear All
                </Button>
                <Button 
                  onClick={createZip} 
                  disabled={isCreatingZip}
                  className="min-w-[120px]"
                >
                  {isCreatingZip ? (
                    <>Creating ZIP...</>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Create ZIP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isCreatingZip && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Creating ZIP file...</span>
                  <span className="text-sm text-muted-foreground">{zipProgress}%</span>
                </div>
                <Progress value={zipProgress} className="h-2" />
              </div>
            )}
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {fileItem.preview ? (
                      <img
                        src={fileItem.preview}
                        alt={fileItem.file.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <File className="h-10 w-10 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium truncate max-w-xs">
                        {fileItem.file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileItem.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;