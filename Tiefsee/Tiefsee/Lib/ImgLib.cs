﻿using ImageMagick;
using ImageMagick.Formats;
using NetVips;
using NetVips.Extensions;
using SQLite;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Media.Imaging;

namespace Tiefsee {

    public class ImgLib {



        /// <summary>
        /// 
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        /*public static BitmapSource PathToBitmapSource(String path) {
            using (BinaryReader reader = new BinaryReader(File.Open(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))) {
                FileInfo fi = new FileInfo(path);
                byte[] bytes = reader.ReadBytes((int)fi.Length);
                MemoryStream ms = new MemoryStream(bytes);
                BitmapDecoder bd = BitmapDecoder.Create(ms, BitmapCreateOptions.DelayCreation, BitmapCacheOption.None);
                reader.Close();
                reader.Dispose();
                return bd.Frames[0];
            }
        }*/

        /// <summary>
        /// 
        /// </summary>
        /// <param name="path"></param>
        /// <param name="func"></param>
        public static void PathToBitmapSource(String path, Action<BitmapSource> func) {
            using (var sr = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read)) {
                BitmapDecoder bd = BitmapDecoder.Create(sr, BitmapCreateOptions.DelayCreation, BitmapCacheOption.None);
                func(bd.Frames[0]);
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="ms"></param>
        /// <returns></returns>
        public static BitmapSource StreamToBitmapSource(MemoryStream ms) {
            BitmapDecoder bd = BitmapDecoder.Create(ms, BitmapCreateOptions.DelayCreation, BitmapCacheOption.None);
            return bd.Frames[0];
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="bs"></param>
        /// <returns></returns>
        public static Stream BitmapSourceToStream(BitmapSource bs) {
            BitmapEncoder encoder = new BmpBitmapEncoder();
            encoder.Frames.Add(BitmapFrame.Create(bs));
            Stream stream = new MemoryStream();
            encoder.Save(stream);
            stream.Position = 0;
            return stream;
        }


        /// <summary>
        /// 
        /// </summary>
        public static MagickImage GetMagickImage(string path) {

            var settings = new MagickReadSettings {
                //BackgroundColor = MagickColors.None,
                Defines = new DngReadDefines {
                    OutputColor = DngOutputColor.SRGB,
                    UseCameraWhitebalance = true,
                    DisableAutoBrightness = false
                }
            };
            MagickImage image = new MagickImage(path, settings);

            /*if (image.ColorSpace == ColorSpace.RGB || image.ColorSpace == ColorSpace.sRGB || image.ColorSpace == ColorSpace.scRGB) {
                image.SetProfile(ColorProfile.SRGB);
            }*/
            image.AutoOrient(); //自動調整方向
            image.SetProfile(ColorProfile.SRGB); //如果不是RGB格式的圖片，需要更多時間來轉檔

            if (image.ColorSpace == ColorSpace.RGB) { //用於處理hdr圖片
                image.ColorSpace = ColorSpace.sRGB;
            }

            return image;
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        public static Stream MagickImage_PathToStream(string path, string type) {

            type = type.ToLower();

            using (MagickImage image = GetMagickImage(path)) {

                MagickFormat imgType;

                if (type == "png") {
                    image.Quality = 0; //壓縮品質
                    imgType = MagickFormat.Png24;
                } else if (type == "jpg" || type == "jpeg") {
                    imgType = MagickFormat.Jpeg;
                } else if (type == "tif" || type == "tiff") {
                    imgType = MagickFormat.Tiff;
                } else {
                    imgType = MagickFormat.Bmp; //bpm也支援透明色
                }

                var ms = new MemoryStream();
                //image.Quality = 1;
                image.Write(ms, imgType);
                ms.Position = 0;

                image.Dispose();

                return ms;
            }
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        public static Stream Wpf_PathToStream(string path) {
            Stream stream = null;
            ImgLib.PathToBitmapSource(path, (BitmapSource bs) => {
                stream = ImgLib.BitmapSourceToStream(bs);
            });
            return stream;
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="path"></param>
        /// <param name="thumbnail"></param>
        /// <param name="minSize"> 預覽圖的寬或高小於這個數值，就讀取原始檔案 </param>
        /// <returns></returns>
        public static Stream Dcraw_PathToStream(string path, bool thumbnail = true, int minSize = 800) {

            string dcRawExe = Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "data", "dcraw.exe");
            string argThumbnail = "";
            if (thumbnail) { argThumbnail = "-e "; }
            var startInfo = new ProcessStartInfo(dcRawExe) {
                Arguments = $"-c -w {argThumbnail}\"{path}\"", // -e=縮圖  -w=套用相機設定  -c=回傳串流
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            };

            try {

                var memoryStream = new MemoryStream();
                using (var process = Process.Start(startInfo)) {
                    using (Stream st = process.StandardOutput.BaseStream) {
                        st.CopyTo(memoryStream);
                        memoryStream.Position = 0;
                    }
                }

                //如果縮圖小於800，就不使用縮圖       
                if (thumbnail) {
                    try {
                        var bs = StreamToBitmapSource(memoryStream);
                        if (bs.PixelWidth < minSize || bs.PixelHeight < minSize) {
                            Console.WriteLine("縮圖太小: " + path);
                            return Dcraw_PathToStream(path, false);
                        } else {
                            Console.WriteLine("縮圖ok: " + path);
                            memoryStream.Position = 0;
                            return memoryStream;
                        }
                    } catch (Exception) {
                        Console.WriteLine("縮圖失敗: " + path);
                    }
                }

                try {
                    memoryStream.Position = 0;
                    using (MagickImage image = new MagickImage(memoryStream)) {
                        MemoryStream imgMs = new MemoryStream(image.ToByteArray(MagickFormat.Jpeg));
                        memoryStream.Close();
                        memoryStream.Dispose();
                        if (thumbnail) {
                            if (image.Width < minSize || image.Height < minSize) {
                                Console.WriteLine("Magick縮圖太小: " + path);
                                imgMs.Close();
                                imgMs.Dispose();
                                return Dcraw_PathToStream(path, false);
                            }
                        }
                        return imgMs;
                    }
                } catch (Exception) {
                    Console.WriteLine("Magick RAW 失敗: " + path);
                }

                memoryStream.Close();
                memoryStream.Dispose();

                //如果無法使用 dcraw ，就改用MagickImage直接讀取
                using (MagickImage image = new MagickImage(path)) {
                    var imgMs = new MemoryStream(image.ToByteArray(MagickFormat.Jpeg));
                    Console.WriteLine("Magick ok: " + path);
                    return imgMs;
                }

            } catch (Exception ee) {
                throw;
            }
        }


        /// <summary>
        /// 以檔案的路徑跟大小來產生雜湊字串(用於暫存檔名)
        /// </summary>
        public static String FileToHash(String path) {
            var sha1 = new System.Security.Cryptography.SHA1CryptoServiceProvider();
            long fileSize = new FileInfo(path).Length; //檔案大小
            long ticks = new FileInfo(path).LastWriteTime.Ticks; //檔案最後修改時間
            String s = Convert.ToBase64String(sha1.ComputeHash(Encoding.Default.GetBytes(fileSize + path + ticks)));
            return s.ToLower().Replace("\\", "").Replace("/", "").Replace("+", "").Replace("=", "");
        }


        /// <summary>
        /// 檢查圖片的 ICC Profile 是否為 CMYK
        /// </summary>
        public static bool IsCMYK(string path) {

            using (var sr = new FileStream(path, FileMode.Open, FileAccess.Read)) {
                int len = (int)sr.Length;
                if (len > 30000) { len = 30000; } //只讀取前30000個字，避免開啟大檔案讀取很久
                byte[] bytes = new byte[len];
                sr.Read(bytes, 0, len);
                string s = System.Text.Encoding.ASCII.GetString(bytes);

                if (s.Contains("prtrCMYK")) {
                    return true;
                }
            }

            return false;
        }


        /// <summary>
        /// BitmapSource 轉 Bitmap
        /// </summary>
        public static Bitmap BitmapSourceToBitmap(BitmapSource source) {
            Bitmap bmp = new Bitmap(
              source.PixelWidth,
              source.PixelHeight,
              System.Drawing.Imaging.PixelFormat.Format32bppPArgb);
            BitmapData data = bmp.LockBits(
              new Rectangle(System.Drawing.Point.Empty, bmp.Size),
              ImageLockMode.WriteOnly,
               System.Drawing.Imaging.PixelFormat.Format32bppPArgb);
            source.CopyPixels(
              System.Windows.Int32Rect.Empty,
              data.Scan0,
              data.Height * data.Stride,
              data.Stride);
            bmp.UnlockBits(data);
            return bmp;
        }


        /// <summary>
        /// 從 stream 內查詢字串第一次出現的位置
        /// </summary>
        /// <param name="stream"></param>
        /// <param name="str"></param>
        /// <returns></returns>
        public static int FindStrIndexOf(FileStream stream, byte[] str) {

            stream.Position = 0;
            byte[] buffer = new byte[stream.Length];
            stream.Read(buffer, 0, (int)stream.Length);

            int index = Array.IndexOf(buffer, str[0]);

            while (index >= 0 && index <= buffer.Length - str.Length) {
                bool found = true;
                for (int i = 1; i < str.Length; i++) {
                    if (buffer[index + i] != str[i]) {
                        found = false;
                        break;
                    }
                }

                if (found) {
                    return index;
                }

                index = Array.IndexOf(buffer, str[0], index + 1);
            }

            return -1;

        }


        /// <summary>
        /// Clip Studio Paint 產生的 clip檔
        /// </summary>
        public static Stream ClipToStream(string clipPath) {
            try {
                string tempFilePath = Path.GetTempFileName();
                using (FileStream fs = new FileStream(clipPath, FileMode.Open, FileAccess.Read)) {

                    //取得 sqlite標頭 的位置。"SQLite format 3"
                    byte[] header = new byte[] { 0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33 };
                    long startIndex = FindStrIndexOf(fs, header);

                    if (startIndex == -1) { return null; }

                    //把 sqlite 寫入到暫存當
                    using (FileStream temp = new FileStream(tempFilePath, FileMode.Create)) {
                        long size = new FileInfo(clipPath).Length;
                        byte[] data = new byte[size];
                        fs.Seek(startIndex, SeekOrigin.Begin);
                        fs.Read(data, 0, data.Length);
                        temp.Write(data, 0, data.Length);
                    }
                }

                //從 sqlite 裡面提取圖片
                Stream stream = new MemoryStream();
                using (var db = new SQLiteConnection(tempFilePath)) {
                    var data = db.ExecuteScalar<byte[]>("SELECT ImageData FROM CanvasPreview");
                    stream.Write(data, 0, data.Length);
                }

                File.Delete(tempFilePath);
                return stream;

            } catch {
                return null;
            }
        }


        /// <summary>
        /// 以 hex 的方式掃描檔案內的 png，並將其提取出來。可用於 afphoto
        /// </summary>
        public static Stream ExtractPngToStream(string filePath) {
            try {
                using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read)) {
                    byte[] startHex = new byte[] { 0x89, 0x50, 0x4E, 0x47 }; //png檔的開頭       
                    int startIndex = FindStrIndexOf(fs, startHex);
                    if (startIndex == -1) { return null; }
                    byte[] endHex = new byte[] { 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 }; //png檔的結尾
                    int endIndex = FindStrIndexOf(fs, endHex);
                    if (startIndex >= endIndex) { return null; }

                    int size = endIndex - startIndex;
                    byte[] fileData = File.ReadAllBytes(filePath);
                    byte[] outputData = new byte[size];
                    Array.Copy(fileData, startIndex, outputData, 0, size);

                    Stream stream = new MemoryStream();
                    stream.Write(outputData, 0, outputData.Length);
                    return stream;
                }
            } catch (Exception) {
                return null;
            }
        }


        #region Nconvert

        /// <summary>
        /// Nconvert 轉檔後取得檔案路徑
        /// </summary>
        /// <param name="path"></param>
        /// <param name="thumbnail"></param>
        /// <param name="type"> jpg/png/tif/bmp </param>
        /// <returns></returns>
        public static string Nconvert_PathToPath(string path, bool thumbnail, string type) {

            type = type.ToLower();
            //string hashName = FileToHash(path) + (isPng ? ".png" : ".bmp"); //暫存檔案名稱
            string hashName = FileToHash(path) + ".jpg"; //暫存檔案名稱
            string filePath = Path.Combine(AppPath.tempDirImgProcessed, hashName); //暫存檔案的路徑

            if (File.Exists(filePath)) { //如果檔案已經存在，就直接回傳
                return filePath;
            }

            if (Directory.Exists(AppPath.tempDirImgProcessed) == false) { //如果暫存資料夾不存在就建立
                Directory.CreateDirectory(AppPath.tempDirImgProcessed);
            }

            string argOut = "";
            if (type == "jpg" || type == "jpeg") {
                argOut = "-out jpeg";
            } else if (type == "tif" || type == "tiff") {
                argOut = "-out tiff";
            } else if (type == "png") {
                argOut = "-clevel 0 -out png"; //輸出成不壓縮的png
            } else {
                argOut = "-out bmp";
            }

            var thumb = thumbnail ? "-embedded_jpeg" : "";
            string arg = $"-quiet {thumb} -raw_camerabalance -raw_autobright -icc {argOut} -o \"{filePath}\" \"{path}\"";
            var d = RunNconvert(arg, 60 * 1000);

            //var ms = new MemoryStream(File.ReadAllBytes(temp));
            return filePath;
        }


        /// <summary>
        /// Nconvert 取得檔案資訊(exif
        /// </summary>
        public static string Nconvert_PathToInfo(string path) {
            string arg = $"-quiet -fullinfo \"{path}\"";
            var d = RunNconvert(arg, 60 * 1000);
            return d;
        }


        /// <summary>
        /// 執行 Nconvert.exe
        /// </summary>
        /// <param name="arg"> 傳入的參數 </param>
        /// <param name="timeout"> 逾時(毫秒)</param>
        /// <returns></returns>
        private static string RunNconvert(string arg, int timeout) {

            //string NconvertExe = Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "plugin\\NConvert\\nconvert.exe");
            string NconvertExe = Plugin.pathNConvert;

            using (var p = new Process()) {
                p.StartInfo.UseShellExecute = false;
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.RedirectStandardOutput = true;
                p.StartInfo.FileName = NconvertExe;
                p.StartInfo.Arguments = arg;
                p.Start();

                string result = p.StandardOutput.ReadToEnd();
                p.WaitForExit(timeout);

                return result;
            }
        }

        #endregion


        #region vips

        private static Dictionary<string, int[]> temp_GetImgSize = new Dictionary<string, int[]>();

        /// <summary> vips的暫存 </summary>
        class DataVips {
            public string key;
            public NetVips.Image vips;
        }

        /// <summary> vips的暫存 </summary>
        static List<DataVips> tempArNewVips = new List<DataVips>();


        /// <summary>
        /// 取得一個 NetVips.Image 物件，此物件會自動回收，不需要using
        /// </summary>
        public static NetVips.Image GetNetVips(string path) {

            lock (tempArNewVips) {

                string key = FileToHash(path);
                for (int i = 0; i < tempArNewVips.Count; i++) {
                    if (tempArNewVips[i].key == key) {
                        return tempArNewVips[i].vips;
                    }
                }

                NetVips.Cache.MaxFiles = 0; //避免NetVips主動暫存檔案，不這麼做的話，同路徑的檔案被修改後，將無法讀取到新的檔案
                NetVips.Image im;

                if (Path.GetExtension(path).ToLower() == ".webp") { //如果是webp就從steam讀取，不這麼做的話，vips會有鎖住檔案的BUG
                    using (var sr = new FileStream(path, FileMode.Open, FileAccess.Read)) {
                        im = NetVips.Image.NewFromStream(sr, access: NetVips.Enums.Access.Random);
                    }
                } else {
                    im = NetVips.Image.NewFromFile(path, true, NetVips.Enums.Access.Random);
                }

                tempArNewVips.Add(new DataVips {
                    key = key, vips = im
                });

                if (tempArNewVips.Count > 5) { //最多保留5個檔案
                    using (tempArNewVips[0].vips) { }
                    tempArNewVips[0].vips = null;
                    tempArNewVips.RemoveAt(0);
                }
                return im;
            }
        }


        /// <summary>
        /// 使用wpf來取得圖片size
        /// </summary>
        /// <param name="path"></param>
        /// <param name="autoOrientation"> 如果圖片有旋轉90°或270°，就長寬對調 </param>
        /// <returns></returns>
        public static int[] GetImgSize(string path, bool autoOrientation) {

            string hash = FileToHash(path);

            if (temp_GetImgSize.ContainsKey(hash)) { //如果暫存裡面
                return temp_GetImgSize[hash];
            }

            int w = 0;
            int h = 0;
            ImgLib.PathToBitmapSource(path, (BitmapSource img) => {
                w = img.PixelWidth;
                h = img.PixelHeight;

                //如果圖片有旋轉90°或270°，就長寬對調
                if (autoOrientation) {
                    var bmData = (BitmapMetadata)img.Metadata;
                    if (bmData != null) {
                        try {
                            object val = bmData.GetQuery("/app1/ifd/exif:{uint=274}"); //取得exif裡面的旋轉
                            if (val != null) {
                                string orientation = val.ToString();
                                if (orientation == "5" || orientation == "6" || orientation == "7" || orientation == "8") { //1=0  8=90  3=180  6=270
                                    w = img.PixelHeight;
                                    h = img.PixelWidth;
                                }
                            }
                        } catch { }
                    }
                }

            });

            int[] ret = new int[] { w, h };
            lock (temp_GetImgSize) {
                temp_GetImgSize.Add(hash, ret); //存入暫存
            }

            return ret;
        }


        /// <summary>
        /// 取得圖片的size，然後把檔案處理成vips可以載入的格式，寫入到暫存資料夾
        /// </summary>
        public static ImgInitInfo GetImgInitInfo(string path, string type) {

            //Console.WriteLine("p:" + path + "  t:" + type);

            ImgInitInfo imgInfo = new ImgInitInfo();
            string path100 = PathToImg100(path);

            //如果已經處理過了，就改成回傳處理過的檔案
            if (File.Exists(path100)) {
                File.SetLastWriteTime(path100, DateTime.Now); //調整最後修改時間，延後暫存被清理
                return GetImgInitInfo(path100, "vips");
            }

            if (type == "vips") {
                int[] wh = GetImgSize(path, true);
                imgInfo.width = wh[0];
                imgInfo.height = wh[1];
                imgInfo.code = "1";
                imgInfo.path = path;
            } else {
                StartWindow.isRunGC = true; //定時執行GC
            }

            if (type == "tif" || type == "tiff") {
                NetVips.Image vImg = GetNetVips(path);

                //im = im.IccTransform("srgb", Enums.PCS.Lab, Enums.Intent.Perceptual); //套用顏色
                VipsSave(vImg, path100, "auto");

                return GetImgInitInfo(path100, "vips");
            }

            if (type == "jpg") {

                if (IsCMYK(path)) { //如果是CMYK，就先套用顏色

                    NetVips.Image Vimg = GetNetVips(path);
                    using (var Vimg2 = Vimg.IccTransform("srgb", Enums.PCS.Lab, Enums.Intent.Perceptual)) { //套用顏色
                        Vimg2.Jpegsave(path100);
                    }
                    return GetImgInitInfo(path100, "vips");
                } else { //直接回傳
                    return GetImgInitInfo(path, "vips");
                }
            }

            if (type == "bitmap") {
                using (Bitmap bmp = new Bitmap(path)) {
                    using (NetVips.Image vImg = bmp.ToVips()) {
                        VipsSave(vImg, path100, "auto");
                    }
                }
                return GetImgInitInfo(path100, "vips");
            }

            if (type == "wpf") {
                PathToBitmapSource(path, (BitmapSource bi) => {
                    using (Bitmap bmp = BitmapSourceToBitmap(bi)) {
                        using (NetVips.Image vImg = bmp.ToVips()) {
                            VipsSave(vImg, path100, "auto");
                        }
                    }
                });
                return GetImgInitInfo(path100, "vips");
            }

            if (type == "magick") {
                using (MagickImage image = GetMagickImage(path)) {
                    if (image.IsOpaque) { //如果不透明
                        image.Write(path100, MagickFormat.Jpeg);

                    } else {
                        using (var ms = new MemoryStream()) {
                            //image.Quality = 1;
                            image.Write(ms, MagickFormat.Tiff);
                            ms.Position = 0;
                            using (NetVips.Image vImg = NetVips.Image.NewFromStream(ms, "", NetVips.Enums.Access.Random)) {
                                VipsSave(vImg, path100, "png");
                            }
                        }
                    }
                    image.Dispose();
                }

                /*
                using (var ms = MagickImage_PathToStream(path, magickType)) {
                    using (NetVips.Image vImg = NetVips.Image.NewFromStream(ms, "", NetVips.Enums.Access.Random)) {
                        VipsSave(vImg, path100, "auto");
                    }
                }*/

                return GetImgInitInfo(path100, "vips");
            }

            if (type == "dcraw") {
                using (Stream stream = ImgLib.Dcraw_PathToStream(path, true, 800)) {
                    using (FileStream fileStream = File.Create(path100)) { //儲存檔案
                        stream.Seek(0, SeekOrigin.Begin);
                        stream.CopyTo(fileStream);
                    }
                }
                return GetImgInitInfo(path100, "vips");
            }

            if (type == "clip") {
                using (Stream stream = ImgLib.ClipToStream(path)) {
                    using (FileStream fileStream = File.Create(path100)) { //儲存檔案
                        stream.Seek(0, SeekOrigin.Begin);
                        stream.CopyTo(fileStream);
                    }
                }
                return GetImgInitInfo(path100, "vips");
            }

            if (type == "extractPng") {
                using (Stream stream = ImgLib.ExtractPngToStream(path)) {
                    using (FileStream fileStream = File.Create(path100)) { //儲存檔案
                        stream.Seek(0, SeekOrigin.Begin);
                        stream.CopyTo(fileStream);
                    }
                }
                return GetImgInitInfo(path100, "vips");
            }

            if (type == "nconvert" || type == "nconvertPng" || type == "nconvertJpg") {
                string nconvertPath;
                if (type == "nconvertPng") {
                    nconvertPath = ImgLib.Nconvert_PathToPath(path, false, "png");
                } else {
                    nconvertPath = ImgLib.Nconvert_PathToPath(path, false, "jpg");
                }
                return GetImgInitInfo(nconvertPath, "vips");
            }

            return imgInfo;
        }


        /// <summary>
        /// 縮放圖片，並且存入暫存資料夾 (只支援jpg、png、tif、webp)
        /// </summary>
        public static string VipsResize(string path, double scale) {

            string hashName = $"{FileToHash(path)}_{scale}.jpg"; //暫存檔案名稱
            string filePath = Path.Combine(AppPath.tempDirImgZoom, hashName); //暫存檔案的路徑

            if (File.Exists(filePath)) { //如果檔案已經存在，就直接回傳
                File.SetLastWriteTime(filePath, DateTime.Now); //調整最後修改時間，延後暫存被清理
                return filePath;
            }

            if (Directory.Exists(AppPath.tempDirImgZoom) == false) { //如果暫存資料夾不存在就建立
                Directory.CreateDirectory(AppPath.tempDirImgZoom);
            }

            string img100 = PathToImg100(path);
            if (File.Exists(img100)) {
                File.SetLastWriteTime(img100, DateTime.Now); //調整最後修改時間，延後暫存被清理
            } else { //如果沒有處理過的暫存檔
                img100 = path; //直接只用原檔
            }

            NetVips.Image im = GetNetVips(img100);
            using (NetVips.Image imR = im.Resize(scale)) {
                VipsSave(imR, filePath, "auto");
            }
            StartWindow.isRunGC = true; //定時執行GC

            return filePath;
        }


        /// <summary>
        /// vips儲存檔案
        /// </summary>
        /// <param name="vImg"></param>
        /// <param name="path"></param>
        /// <param name="type"> jpg/png/auto </param>
        private static void VipsSave(NetVips.Image vImg, string path, string type) {

            if (type == "jpg") {
                vImg.Jpegsave(filename: path, q: 89);

            } else if (type == "png") {
                vImg.Pngsave(
                      filename: path,
                      compression: 0,
                      interlace: false,
                      filter: Enums.ForeignPngFilter.None
               );
            } else {

                bool transparent = VipsHasTransparent(vImg);
                if (transparent) {
                    VipsSave(vImg, path, "png");
                } else {
                    VipsSave(vImg, path, "jpg");
                }
            }
        }


        /// <summary> 檢查vips是否包含透明色 </summary>
        public static bool VipsHasTransparent(NetVips.Image im) {

            //if (im.HasAlpha() == false) { return false; } //使用Bitmap的話會失效

            int bands = im.Bands; //取得色板的數量，例如rgb=4、rgba=4
            bool hasAlpha =
               bands == 2 ||
               bands > 4 ||
               (bands == 4 && im.Interpretation != Enums.Interpretation.Cmyk);

            if (hasAlpha == false) { return false; } //如果不含透明色板就直接回傳

            var d = im[im.Bands - 1].Min(); //取得最後一個色板的最小值
            return d != 255; //如果不是255，表示有不透明的顏色
        }


        /// <summary> 取得「img100」暫存資料夾裡面的檔案名稱  </summary>
        public static string PathToImg100(string path) {
            string hashName = $"{FileToHash(path)}.jpg"; //暫存檔案名稱
            string filePath = Path.Combine(AppPath.tempDirImgProcessed, hashName); //暫存檔案的路徑
            if (Directory.Exists(AppPath.tempDirImgProcessed) == false) {
                Directory.CreateDirectory(AppPath.tempDirImgProcessed);
            }
            return filePath;
        }

        #endregion


    }



    public class ImgInitInfo {
        public string code = "-1";
        public string path = "";
        public int width = 0;
        public int height = 0;
        //public string msg = "";
    }

}
