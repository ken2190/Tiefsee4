﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Tiefsee {
    public class AppPath {

        /// <summary> AppData(使用者資料) </summary>
        public static string appData;

        /// <summary> Start.ini </summary>
        public static string appDataStartIni;

        /// <summary> Lock檔案，用於弊端是否短時間內重複啟動 </summary>
        public static string appDataLock;

        /// <summary> Port Dir </summary>
        public static string appDataPort;

        /// <summary> Plugin Dir </summary>
        public static string appDataPlugin;

        /// <summary> Strting.json </summary>
        public static string appDataSetting;


        /// <summary> 暫存資料夾 - 處理過的圖片(原始大小) </summary>
        public static string tempDirImgProcessed = "";

        /// <summary> 暫存資料夾 - 縮放後的圖片 </summary>
        public static string tempDirImgZoom = "";

        /// <summary> 暫存資料夾 - 從網路下載的檔案 </summary>
        public static string tempDirWebFile = "";

        /// <summary> 工作列右下角的圖示 </summary>
        public static string logoIcon = "";
        

        public static void Init() {

            appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Tiefsee");

            appDataLock = Path.Combine(appData, "Lock");
            appDataStartIni = Path.Combine(appData, "Start.ini");
            appDataPort = Path.Combine(appData, "Port");
            appDataPlugin = Path.Combine(appData, "Plugin");
            appDataSetting = Path.Combine(appData, "Setting.json");

            tempDirImgProcessed = Path.Combine(Path.GetTempPath(), "Tiefsee\\ImgProcessed");
            tempDirImgZoom = Path.Combine(Path.GetTempPath(), "Tiefsee\\ImgZoom");
            tempDirWebFile = Path.Combine(Path.GetTempPath(), "Tiefsee\\WebFile");

            logoIcon = Path.Combine(System.AppDomain.CurrentDomain.BaseDirectory, "www/img/logo.ico");

            //------

            //把Tiefsee4資料夾轉移成Tiefsee
            string appData_old = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Tiefsee4");
            if (Directory.Exists(appData) == false && Directory.Exists(appData_old) == true) {
                try {
                    Directory.Move(appData_old, appData);
                } catch { }
            }

            //刪除舊版Tiefsee的暫存資料夾
            string img100 = Path.Combine(Path.GetTempPath(), "Tiefsee\\img100");
            if (Directory.Exists(img100)) {
                try {
                    Directory.Delete(img100, true);
                } catch { }
            }
            string imgScale = Path.Combine(Path.GetTempPath(), "Tiefsee\\imgScale");
            if (Directory.Exists(imgScale)) {
                try {
                    Directory.Delete(imgScale, true);
                } catch { }
            }

            //------

            //如果資料夾不存在，就新建

            if (Directory.Exists(appData) == false) {
                Directory.CreateDirectory(appData);
            }
            if (Directory.Exists(appDataPlugin) == false) {
                Directory.CreateDirectory(appDataPlugin);
            }
        }






    }
}
