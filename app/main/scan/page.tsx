"use client";
import React from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
type Props = {};

const page = (props: Props) => {
  return <Scanner onScan={(result) => console.log(result)} />;
};

export default page;
