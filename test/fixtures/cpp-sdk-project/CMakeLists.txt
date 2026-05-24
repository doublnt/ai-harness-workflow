cmake_minimum_required(VERSION 3.16)
project(MySDK VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(mysdk SHARED src/client.cpp)
target_include_directories(mysdk PUBLIC include)
