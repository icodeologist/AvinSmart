package models

import "time"

type Category struct {
	ID            uint          `gorm:"primaryKey;column:id" json:"id"`
	Name          string        `gorm:"column:name;type:varchar(120);not null;uniqueIndex" json:"name"`
	SubCategories []SubCategory `gorm:"foreignKey:CategoryID" json:"sub_categories,omitempty"`
	CreatedAt     time.Time     `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time     `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Category) TableName() string {
	return "categories"
}

type SubCategory struct {
	ID         uint      `gorm:"primaryKey;column:id" json:"id"`
	CategoryID uint      `gorm:"column:category_id;not null;index;uniqueIndex:idx_sub_categories_category_name" json:"category_id"`
	Category   Category  `gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"category"`
	Name       string    `gorm:"column:name;type:varchar(120);not null;uniqueIndex:idx_sub_categories_category_name" json:"name"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (SubCategory) TableName() string {
	return "sub_categories"
}
