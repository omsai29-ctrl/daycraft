package com.omsai.daycraft;

import com.getcapacitor.BridgeActivity;

import com.omsai.daycraft.DaycraftFilesPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DaycraftFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
